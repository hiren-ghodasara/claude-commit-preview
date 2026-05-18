# Claude Commit Preview

> AI-generated commit messages you **preview and edit before committing** — powered by Claude Code CLI, inside VS Code.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/hiren-ghodasara.claude-auto-commit?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=hiren-ghodasara.claude-auto-commit)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/hiren-ghodasara.claude-auto-commit)](https://marketplace.visualstudio.com/items?itemName=hiren-ghodasara.claude-auto-commit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## See It in Action

<img src="images/commit-preview.gif" alt="Claude Commit Preview — generate, preview, and commit with one click" width="70%"/>

Stage your changes, click ✨, and Claude fills your commit message box instantly.  
**Read it. Edit it if you want. Then commit.**

---

## Why Claude Commit Preview?

Most AI commit tools commit blindly — you don't see what's being written until it's done.  
**Claude Commit Preview puts you in the driver's seat.**

1. Claude analyzes your staged diff using the Claude Code CLI already on your machine
2. The generated message drops into your Source Control input box — visible and editable
3. You choose: **Commit Now** or **Edit First**

You always review before anything is committed. No surprises.

---

## How It Works

```
git add (stage changes)
    ↓
Click ✨ in Source Control toolbar
    ↓
Claude reads your staged diff via Claude CLI
    ↓
Commit message appears in the SCM input box   ← you can read & edit here
    ↓
"Commit Now"  or  "Edit First"  — your choice
```

---

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated (`claude --version` should work in your terminal)
- VS Code 1.85+
- A git repository with staged changes (`git add`)

---

## Features

- **Preview commit message before committing** — message is written into the SCM box, not committed blindly
- **Edit before you commit** — full control, always
- **One-click generation** — ✨ sparkle button in the Source Control toolbar
- **Jira / Linear ticket auto-tagging** — detects branch ticket (e.g. `SP-123`) and appends `[SP-123]`
- **Three commit styles** — Conventional Commits, simple one-liner, or detailed with body
- **No API key required** — reuses your existing Claude Code CLI session
- **Works with any language or framework**
- **Debug output panel** — full step-by-step logs in the Output panel

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

If your branch name contains a ticket number, it is automatically appended to the generated message:

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
