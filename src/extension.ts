import * as vscode from "vscode";
import { execSync, spawn } from "child_process";

let log: vscode.OutputChannel;
let isDebug = false;

function dbg(msg: string) {
  if (isDebug) {
    log.appendLine(msg);
  }
}

export function activate(context: vscode.ExtensionContext) {
  isDebug = context.extensionMode === vscode.ExtensionMode.Development;
  log = vscode.window.createOutputChannel("Claude Commit Preview");

  if (isDebug) {
    log.appendLine("[activate] Claude Commit Preview extension activated");
    log.show(true);
  }

  const disposable = vscode.commands.registerCommand(
    "claudeCommitPreview.generateMessage",
    async (...args: any[]) => {
      dbg("\n--- Generate Commit Message triggered ---");
      // When launched from the Source Control title button (scm/title), VS Code
      // passes that panel's git repository as the first argument, so we know
      // exactly which repo the user clicked on. From the command palette there
      // is no argument and we fall back to heuristics.
      await generateCommitMessage(args[0]);
    }
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(log);
}

async function generateCommitMessage(invocationArg?: any) {
  // Resolve the Git extension up front so we can pick the correct repository.
  // The command is only available from the Source Control title button, so VS
  // Code always hands us that panel's repository — this is how we target the
  // right repo in a multi-root / umbrella workspace.
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    vscode.window.showErrorMessage("Claude Commit Preview: VS Code Git extension not found.");
    return;
  }
  const git = gitExtension.isActive
    ? gitExtension.exports
    : await gitExtension.activate();
  const api = git.getAPI(1);

  const repo = resolveRepoFromArg(api, invocationArg);
  if (!repo) {
    vscode.window.showErrorMessage(
      "Claude Commit Preview: Could not determine the repository. Click the ✨ button in the Source Control panel of the repo you want to commit."
    );
    return;
  }

  const repoPath = repo.rootUri.fsPath;
  dbg(`[info] Repo path: ${repoPath}`);

  let diff = "";
  let stagedFiles = "";
  let branch = "";
  let recentCommits = "";

  try {
    diff = execSync("git diff --cached", {
      cwd: repoPath,
      maxBuffer: 1024 * 1024 * 5,
    }).toString();

    stagedFiles = execSync("git diff --cached --name-status", {
      cwd: repoPath,
    }).toString();

    branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: repoPath,
    }).toString().trim();

    // Recent commits let Claude infer this repo's subject format and any
    // ticket convention (e.g. "[SP-123]") on its own — same as /commit-commands:commit.
    try {
      recentCommits = execSync("git log --oneline -n 10", {
        cwd: repoPath,
      }).toString().trim();
    } catch {
      recentCommits = "";
    }

    dbg(`[git] Branch: ${branch}`);
    dbg(`[git] Staged files:\n${stagedFiles || "(none)"}`);
    dbg(`[git] Diff length: ${diff.length} chars`);
  } catch (e: any) {
    vscode.window.showErrorMessage(
      "Claude Commit Preview: Failed to read git diff. Make sure you have staged changes (`git add`)."
    );
    return;
  }

  if (!diff.trim()) {
    vscode.window.showWarningMessage(
      "Claude Commit Preview: No staged changes found. Stage your changes with `git add` first."
    );
    return;
  }

  const config = vscode.workspace.getConfiguration("claudeCommitPreview");
  const addCoAuthor = config.get<boolean>("addCoAuthor") ?? true;
  dbg(`[config] Co-author: ${addCoAuthor}`);

  const coAuthorRule = addCoAuthor
    ? `- End with your standard "Co-Authored-By: Claude ... <noreply@anthropic.com>" trailer on its own line, after a blank line.`
    : `- Do NOT add any co-author or attribution trailer.`;

  const prompt = `Based on the staged changes below, write a single git commit message — the same message you would use if you were creating this commit yourself.

Match this repository's established style as shown in the recent commits: use the same subject format and the same ticket/issue convention (e.g. a "[PROJECT-123]" tag) if the repo uses one. Infer the ticket from the branch name when that convention is in use.

Guidelines:
- Subject: concise and imperative, focused on the INTENT of the change (what it accomplishes), not a file-by-file summary.
- Then a blank line, then a body in flowing prose wrapped at ~72 characters explaining what changed and why. Omit the body for trivial changes.
${coAuthorRule}

Current branch: ${branch}

Recent commits (match their format and ticket convention):
${recentCommits || "(none)"}

Staged files:
${stagedFiles}

Staged diff:
\`\`\`diff
${diff.slice(0, 12000)}${diff.length > 12000 ? "\n... (truncated)" : ""}
\`\`\`

Reply with ONLY the commit message — no explanation, no markdown fences, nothing else.`;

  let commitMessage = "";

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Claude Commit Preview",
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: "Generating commit message via Claude CLI..." });
      dbg("[claude] Calling Claude CLI...");

      commitMessage = await runClaude(prompt);

      if (commitMessage) {
        commitMessage = stripFences(commitMessage);
        dbg(`[claude] Final message:\n${commitMessage}`);
      }
    }
  );

  if (!commitMessage) {
    return;
  }

  repo.inputBox.value = commitMessage;
  dbg("[done] Commit message filled in SCM input box");

  const action = await vscode.window.showInformationMessage(
    `✨ Commit message filled! Review it in the Source Control panel.`,
    "Commit Now",
    "Edit First"
  );

  if (action === "Commit Now") {
    // Pass the resolved repo so the correct one is committed in a
    // multi-root / umbrella workspace.
    await vscode.commands.executeCommand("git.commit", repo);
  } else if (action === "Edit First") {
    await vscode.commands.executeCommand("workbench.view.scm");
  }
}

// When the command is invoked from the Source Control title button, VS Code
// passes the clicked panel's repository as the first argument. Depending on the
// VS Code version this is either the Git API Repository (has `rootUri`) or a
// SourceControl (has `rootUri` too). Normalise it to one of the API's own
// Repository objects by matching on the repo root.
function resolveRepoFromArg(api: any, arg: any): any | undefined {
  const rootFsPath: string | undefined =
    arg?.rootUri?.fsPath ?? arg?.repository?.rootUri?.fsPath;
  if (!rootFsPath) {
    return undefined;
  }
  const match = (api.repositories ?? []).find(
    (rp: any) => rp.rootUri.fsPath === rootFsPath
  );
  if (match) {
    dbg(`[git] Repo from SCM button: ${match.rootUri.fsPath}`);
    return match;
  }
  // The arg is already a usable Repository even if it isn't in api.repositories.
  if (arg?.rootUri && arg?.inputBox && arg?.state) {
    dbg(`[git] Repo from SCM button (direct): ${rootFsPath}`);
    return arg;
  }
  return undefined;
}

// Remove any surrounding markdown code fences the model may have wrapped the
// message in. Everything else (subject, ticket, body, co-author trailer) is
// produced by Claude itself, matching /commit-commands:commit.
function stripFences(raw: string): string {
  return raw.trim().replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    dbg(`[claude] Running: claude -p <prompt>`);

    const child = spawn("claude", ["-p", prompt], { timeout: 60000 });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    child.on("close", (code: number) => {
      dbg(stderr ? `[claude] Stderr: ${stderr}` : "");
      if (code !== 0) {
        dbg(`[claude] Error (exit code ${code}): ${stderr}`);
        vscode.window.showErrorMessage(
          `Claude Commit Preview: Claude CLI error — ${stderr || `exit code ${code}`}`
        );
        resolve("");
        return;
      }
      dbg(`[claude] Stdout length: ${stdout.length} chars`);
      resolve(stdout.trim());
    });

    child.on("error", (err: Error) => {
      dbg(`[claude] Spawn error: ${err.message}`);
      vscode.window.showErrorMessage(
        `Claude Commit Preview: Could not run Claude CLI — ${err.message}`
      );
      resolve("");
    });
  });
}

export function deactivate() {
  dbg("[deactivate] Extension deactivated");
}
