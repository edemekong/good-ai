# Codex integration

Good-AI's first reference client is Codex. Codex reads repository guidance
from `AGENTS.md`, discovers repository skills from `.agents/skills`, and
connects to local MCP servers through `config.toml`.

## Install

Install the CLI so the `good-ai` command is available to Codex:

```bash
npm install --global @thinkinteltech/good-ai
mkdir -p ~/.codex
good-ai install
```

The installer will:

1. Create `~/.good-ai` and the local SQLite database.
2. Install the skill at `~/.agents/skills/good-ai/SKILL.md`.
3. Add the local server to `~/.codex/config.toml`:

```toml
[mcp_servers.good_ai]
command = "good-ai"
args = ["mcp"]
```

Existing Codex configuration is preserved. If the installer encounters an
unsupported inline `mcp_servers` TOML value, it reports the configuration as
skipped instead of rewriting it.

## Verify

Confirm the server is registered:

```bash
codex mcp list
```

Start a new Codex session from a repository containing `AGENTS.md`, then use
`/mcp` to confirm the Good-AI tools are connected. Ask Codex to summarize its
active instructions to confirm the repository guidance is loaded.

## Smoke test

In a fresh Codex conversation:

1. Complete a small task and confirm the result is genuinely successful.
2. Ask Codex to save the reusable lesson to Good-AI.
3. Start a fresh conversation with a similar task.
4. Ask Codex to search Good-AI before acting.
5. Reuse the relevant result and report whether it worked.
6. Confirm Codex records the reuse outcome with `good_ai_feedback`.
7. Verify the stored result with `good-ai list` and `good-ai show <id>`.

This flow is offline after the package and dependencies are installed. Good-AI
stores structured lessons only; it does not store raw conversations or call a
hosted AI service.
