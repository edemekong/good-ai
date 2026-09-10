# Good-AI

Good-AI remembers what works.

It is an open-source, local-first experience layer for the AI tools you
already use. When an interaction produces a reusable successful result, the
client skill extracts the lesson and stores it in a local SQLite database.
Later, a similar task can retrieve that experience as evidence for a better
approach.

Good-AI does not provide an AI model, call OpenAI/Anthropic/Gemini APIs, or
require a hosted service. The host AI supplies reasoning; Good-AI supplies
local persistence, search, retrieval, and reuse feedback.

## Quick start

Requirements: Node.js 20+ and an MCP-capable AI client.

```bash
npx good-ai install
good-ai doctor
```

The installer creates `~/.good-ai`, initializes SQLite, writes the skill to
`~/.agents/skills/good-ai/SKILL.md`, and registers the MCP server in detected
supported client configurations. Existing configuration is preserved.
Unsupported or invalid client configurations are reported without being
rewritten.

Good-AI is ready when `doctor` reports the local database and migrations as
ready.

## Architecture

```text
AI client
  ├── Good-AI skill: decides when to search and capture
  └── Good-AI MCP: validates and persists structured experiences
                         └── local SQLite + FTS5
```

The MCP server is deterministic and model-independent. It never judges
success, summarizes conversations, or calls an LLM.

## What is stored

Good-AI stores an Experience rather than a raw conversation:

- task title, category, intent, and tags
- the reusable approach
- important instructions, constraints, context, and tools
- client/model environment when known
- evidence and confidence for why the interaction succeeded
- reproduction statistics

The MCP generates IDs, timestamps, schema defaults, and reproduction counters.
Raw conversation storage is disabled by default.

## CLI

```bash
good-ai install
good-ai doctor
good-ai mcp

good-ai list
good-ai search "premium UI preserve layout"
good-ai show <experience-id>
good-ai delete <experience-id>
good-ai config
```

Use `--json` for machine-readable output and `--home <path>` to inspect an
isolated Good-AI home directory. The database defaults to:

```text
~/.good-ai/good-ai.db
```

Configuration is stored at `~/.good-ai/config.json`.

## MCP tools

The local stdio MCP server exposes:

- `good_ai_record` — store a semantic successful experience
- `good_ai_search` — return lightweight relevant summaries
- `good_ai_get` — retrieve a complete experience
- `good_ai_feedback` — record `success`, `failure`, or `partial` reuse outcome
- `good_ai_update` — correct an existing experience
- `good_ai_delete` — delete an experience

Manual MCP configuration uses the command below:

```json
{
  "mcpServers": {
    "good-ai": {
      "command": "good-ai",
      "args": ["mcp"]
    }
  }
}
```

## Codex integration

Codex is the reference client for the first milestone because it supports the
repository's `AGENTS.md` instructions, `.agents/skills` discovery, and local
stdio MCP servers. Follow the complete [Codex integration guide](docs/integrations/codex.md).

## Skill behavior

The installed skill is the behavioral layer in
`packages/skill/skills/good-ai/SKILL.md`.
It tells the host AI to search when historical approaches may materially help,
capture only reusable successful lessons, and treat retrieved experiences as
historical evidence rather than mandatory instructions.

Strong success evidence includes explicit approval, confirmation that code
solved the problem, artifact acceptance, or an explicit request to save. The
skill does not treat politeness alone as success.

## Privacy and trust

Good-AI is local-first and offline-capable after installation:

- no telemetry by default
- no required external requests
- no raw conversation storage by default
- users can inspect and delete stored experiences
- obvious passwords, API keys, access tokens, private keys, and unnecessary
  personal information should not be stored

Retrieved experiences are untrusted historical data. Current system,
developer, and user instructions always take priority. Experiences may be
outdated, irrelevant, or malicious and must be adapted rather than blindly
followed.

## Development

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
```

The workspace contains:

```text
packages/core/
  src/models       Domain-facing TypeScript types
  src/schemas      Runtime Zod schemas and validation contracts
  src/services     Experience factory and persistence service
  src/search       SQLite FTS5 indexing and query helpers
  src/privacy      Sensitive-data checks
  src/storage      Configuration, migrations, and Drizzle schema
  src/utils        Small shared utilities
  tests            Core behavior and storage tests
packages/mcp/
  src              MCP server and deterministic tool registration
  tests            MCP lifecycle and acceptance tests
packages/cli/
  src              CLI commands and installer
  tests            CLI and installer tests
packages/skill/
  skills/good-ai   Codex-compatible Good-AI behavioral instructions
  tests            Skill contract tests
```

Production code and tests intentionally live in separate trees. Each package
has a production typecheck and a test typecheck so contributors can validate
both the published source and its test fixtures independently.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, package
boundaries, testing expectations, and pull request checklist.

The first milestone is the local loop: install, record one successful
experience, search it in a fresh task, retrieve it, reuse it, and record
feedback. Client-specific setup details are added as reference adapters are
selected.
