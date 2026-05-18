import * as vscode from "vscode";
import { execSync, spawn } from "child_process";

let log: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  log = vscode.window.createOutputChannel("Claude Commit Preview");
  log.appendLine("[activate] Claude Commit Preview extension activated");
  log.show(true); // show panel, keep focus in editor

  const disposable = vscode.commands.registerCommand(
    "claudeCommitPreview.generateMessage",
    async () => {
      log.appendLine("\n--- Generate Commit Message triggered ---");
      await generateCommitMessage();
    }
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(log);
}

async function generateCommitMessage() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    log.appendLine("[error] No workspace folder found");
    vscode.window.showErrorMessage("Claude Commit Preview: No workspace folder found.");
    return;
  }

  const repoPath = workspaceFolders[0].uri.fsPath;
  log.appendLine(`[info] Repo path: ${repoPath}`);

  let diff = "";
  let stagedFiles = "";
  let branch = "";

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

    log.appendLine(`[git] Branch: ${branch}`);
    log.appendLine(`[git] Staged files:\n${stagedFiles || "(none)"}`);
    log.appendLine(`[git] Diff length: ${diff.length} chars`);
  } catch (e: any) {
    log.appendLine(`[error] git diff failed: ${e.message}`);
    vscode.window.showErrorMessage(
      "Claude Commit Preview: Failed to read git diff. Make sure you have staged changes (`git add`)."
    );
    return;
  }

  if (!diff.trim()) {
    log.appendLine("[warn] No staged changes found");
    vscode.window.showWarningMessage(
      "Claude Commit Preview: No staged changes found. Stage your changes with `git add` first."
    );
    return;
  }

  const config = vscode.workspace.getConfiguration("claudeCommitPreview");
  const commitStyle = config.get<string>("commitStyle") || "conventional";
  log.appendLine(`[config] Commit style: ${commitStyle}`);

  const styleInstructions: Record<string, string> = {
    conventional: `Follow Conventional Commits: <type>(<scope>): <description>. Types: feat, fix, docs, style, refactor, perf, test, chore. Keep subject under 72 chars.`,
    simple: `Write a short one-line message under 72 characters starting with a verb (Add, Fix, Update, Remove).`,
    detailed: `Write a short subject line, blank line, then a body explaining WHAT changed and WHY using bullet points.`,
  };

  const prompt = `You are an expert developer. Analyze this git diff and write a commit message.

Style: ${styleInstructions[commitStyle]}

Staged files:
${stagedFiles}

Diff:
\`\`\`diff
${diff.slice(0, 6000)}${diff.length > 6000 ? "\n... (truncated)" : ""}
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
      log.appendLine("[claude] Calling Claude CLI...");

      commitMessage = await runClaude(prompt);

      if (commitMessage) {
        const ticket = extractJiraTicket(branch);
        if (ticket) {
          commitMessage = `${commitMessage} [${ticket}]`;
          log.appendLine(`[git] Jira ticket extracted: ${ticket}`);
        }
        log.appendLine(`[claude] Final message:\n${commitMessage}`);
      }
    }
  );

  if (!commitMessage) {
    log.appendLine("[error] No commit message returned, aborting");
    return;
  }

  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    log.appendLine("[error] vscode.git extension not found");
    vscode.window.showErrorMessage("Claude Commit Preview: VS Code Git extension not found.");
    return;
  }

  log.appendLine("[git] Got vscode.git extension");
  const git = gitExtension.isActive
    ? gitExtension.exports
    : await gitExtension.activate();

  const api = git.getAPI(1);
  const repos = api.repositories;
  log.appendLine(`[git] Repositories found: ${repos?.length ?? 0}`);

  if (!repos || repos.length === 0) {
    log.appendLine("[error] No git repositories in workspace");
    vscode.window.showErrorMessage("Claude Commit Preview: No git repository found in workspace.");
    return;
  }

  repos[0].inputBox.value = commitMessage;
  log.appendLine("[done] Commit message filled in SCM input box");

  const action = await vscode.window.showInformationMessage(
    `✨ Commit message filled! Review it in the Source Control panel.`,
    "Commit Now",
    "Edit First"
  );

  if (action === "Commit Now") {
    await vscode.commands.executeCommand("git.commit");
  } else if (action === "Edit First") {
    await vscode.commands.executeCommand("workbench.view.scm");
  }
}

function extractJiraTicket(branch: string): string {
  // Matches patterns like SP-123, PROJ-456 anywhere in the branch name
  // Handles: SP-123, fix/SP-123, feat/SP-123-some-description, etc.
  const match = branch.match(/([A-Z]+-\d+)/i);
  return match ? match[1].toUpperCase() : "";
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    log.appendLine(`[claude] Running: claude -p <prompt>`);

    // Use spawn with arg array — avoids all shell escaping issues on Windows
    const child = spawn("claude", ["-p", prompt], { timeout: 60000 });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    child.on("close", (code: number) => {
      if (stderr) {
        log.appendLine(`[claude] Stderr: ${stderr}`);
      }
      if (code !== 0) {
        log.appendLine(`[claude] Error (exit code ${code}): ${stderr}`);
        vscode.window.showErrorMessage(
          `Claude Commit Preview: Claude CLI error — ${stderr || `exit code ${code}`}`
        );
        resolve("");
        return;
      }
      log.appendLine(`[claude] Stdout length: ${stdout.length} chars`);
      resolve(stdout.trim());
    });

    child.on("error", (err: Error) => {
      log.appendLine(`[claude] Spawn error: ${err.message}`);
      vscode.window.showErrorMessage(
        `Claude Commit Preview: Could not run Claude CLI — ${err.message}`
      );
      resolve("");
    });
  });
}

export function deactivate() {
  log?.appendLine("[deactivate] Extension deactivated");
}
