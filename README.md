# Claude Commit Preview

> AI-generated commit messages with **preview before you commit** — powered by Claude Code CLI, inside VS Code.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/hiren-ghodasara.claude-auto-commit?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=hiren-ghodasara.claude-auto-commit)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/hiren-ghodasara.claude-auto-commit)](https://marketplace.visualstudio.com/items?itemName=hiren-ghodasara.claude-auto-commit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Preview Your Commit Message Before It's Committed

Most AI commit tools commit instantly — you don't get a chance to review or edit.  
**Claude Commit Preview is different.**

Here's the flow:

```
Stage changes  →  Click ✨  →  Claude generates message
     →  Message drops into SCM box  →  You review it
          →  "Commit Now" or "Edit First" — your choice
```

You always stay in control. The message lands in your Source Control input box where you can read it, tweak it, or commit it as-is.

---

## What It Does

**Claude Commit Preview** uses the [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) already installed on your machine to analyze your staged git diff and generate a meaningful, conventional commit message — then fills it directly into the VS Code Source Control input box for your review.

No API keys. No extra setup. Just stage, click, review, commit.

---

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated (`claude --version` should work in your terminal)
- VS Code 1.85+
- A git repository with staged changes (`git add`)

---

## Features

- **Preview before commit** — message is filled into the SCM box so you can read and edit it first
- **One-click generation** — ✨ button in the Source Control panel toolbar
- **"Commit Now" or "Edit First"** — choose to commit immediately or refine the message
- **Jira / Linear ticket auto-tagging** — detects branch ticket (e.g. `SP-123`) and appends `[SP-123]`
- **Three commit styles** — Conventional Commits, simple one-liner, or detailed with body
- **Zero API key setup** — reuses your existing Claude Code CLI session
- **Works with any language or framework**
- **Debug output panel** — full logs in the Output panel for easy troubleshooting

---

## How to Use

1. Stage your changes (`git add` or click `+` in Source Control)
2. Open the **Source Control** panel (`Ctrl+Shift+G`)
3. Click the **✨ sparkle button** in the toolbar
4. Claude analyzes your diff and fills the commit message into the input box
5. **Review the message** — read it, edit it if needed
6. Click **Commit Now** to commit immediately, or **Edit First** to refine it in the SCM panel

> The message is always editable before it's committed. You're never locked in.

---

## Commit Styles

Configure via `Settings → Claude Commit Preview → Commit Style`:

| Style | Example output |
|-------|---------------|
| `conventional` *(default)* | `feat(auth): add OAuth2 login support [SP-123]` |
| `simple` | `Add OAuth2 login support [SP-123]` |
| `detailed` | Subject + blank line + bullet-point body |

---

## Jira / Linear Ticket Auto-Tagging

If your branch name contains a ticket number, it is automatically appended to the commit message:

| Branch name | Appended tag |
|------------|-------------|
| `SP-123` | `[SP-123]` |
| `fix/SP-123` | `[SP-123]` |
| `feat/SP-123-some-description` | `[SP-123]` |
| `main`, `develop` | *(nothing appended)* |

---

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `claudeCommitPreview.commitStyle` | `conventional` | Style of commit message: `conventional`, `simple`, `detailed` |

---

## Troubleshooting

**✨ button not visible?**
Make sure you have a git repository open and the Source Control panel is active (`Ctrl+Shift+G`).

**"No staged changes found"**
Run `git add <file>` or use the `+` button in Source Control to stage files first.

**Claude CLI error?**
Open **Output** panel (`Ctrl+Shift+U`) → select **Claude Commit Preview** to see detailed logs.
Make sure `claude` is in your PATH: run `claude --version` in a terminal to verify.

**No Jira tag appended?**
The branch must contain a pattern like `ABC-123` (uppercase letters + hyphen + digits). Branches like `main` or `develop` are skipped.

---

## Debug Logs

Open **Output** panel (`Ctrl+Shift+U`) → select **Claude Commit Preview** from the dropdown to see step-by-step logs for every generation attempt.

---

## Contributing

Issues and PRs welcome at [github.com/hiren-ghodasara/claude-auto-commit](https://github.com/hiren-ghodasara/claude-auto-commit).

---

## License

[MIT](LICENSE) © Hiren Ghodasara
