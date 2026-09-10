# Client integrations

`good-ai install` configures Good-AI for the local AI clients it detects. The
installer is idempotent, preserves unrelated configuration, and reports any
client configuration it cannot safely update.

## Skills

Good-AI installs the portable `SKILL.md` into the standard user-level skill
directory used by the clients on the machine:

| Client            | Skill path                           |
| ----------------- | ------------------------------------ |
| Codex and VS Code | `~/.agents/skills/good-ai/SKILL.md`  |
| Cursor            | `~/.cursor/skills/good-ai/SKILL.md`  |
| Claude Code       | `~/.claude/skills/good-ai/SKILL.md`  |
| VS Code / Copilot | `~/.copilot/skills/good-ai/SKILL.md` |

The `.agents` copy is the portable Agent Skills version. Native copies are
installed when the corresponding client is detected.

## MCP servers

The local Good-AI server uses the stdio transport and is registered using each
client's native configuration format:

| Client                                    | User configuration                    |
| ----------------------------------------- | ------------------------------------- |
| Codex CLI, Codex IDE, and ChatGPT desktop | `~/.codex/config.toml`                |
| Claude Code                               | `~/.claude.json`                      |
| Cursor                                    | `~/.cursor/mcp.json`                  |
| VS Code                                   | VS Code user-profile `mcp.json`       |
| Windsurf                                  | `~/.codeium/windsurf/mcp_config.json` |

The global installer does not modify a repository's `.vscode/mcp.json` or
other workspace configuration. Add a workspace-scoped server manually when
the configuration should be shared with a repository team.

## One-command setup

```bash
npx --yes @thinkinteltech/good-ai install
npx --yes @thinkinteltech/good-ai doctor
```

For repeated CLI use, install the package globally and run `good-ai` directly:

```bash
npm install --global @thinkinteltech/good-ai
good-ai install
good-ai doctor
```
