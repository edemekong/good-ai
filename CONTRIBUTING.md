# Contributing to Good-AI

Thank you for helping improve Good-AI. The project is intentionally small,
local-first, and dependency-conscious so contributors can understand the
whole path from an AI client to stored experience.

## Development setup

Requirements are Node.js 20+ and pnpm through Corepack:

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm typecheck
corepack pnpm typecheck:tests
corepack pnpm test
corepack pnpm format:check
```

Run the command that matches the area you changed when iterating:

```bash
corepack pnpm --filter @thinkinteltech/core test
corepack pnpm --filter @thinkinteltech/mcp test
corepack pnpm --filter good-ai test
```

## Repository structure

Each package keeps publishable implementation in `src/` and tests in a
separate `tests/` directory. The core package is organized by responsibility:

- `models/` exposes domain types.
- `schemas/` owns runtime validation and serialized contracts.
- `services/` owns experience creation and persistence behavior.
- `search/` owns FTS5 indexing and queries.
- `privacy/` owns sensitive-data checks.
- `storage/` owns SQLite configuration, migrations, and tables.
- `utils/` contains small shared helpers without product logic.

The MCP package is deterministic. The skill decides when an interaction is
worth searching for or recording; the MCP server validates and stores the
structured result. Do not add model calls, telemetry, hosted persistence, or
raw conversation storage without a product decision and PRD update.

## Testing and code quality

Behavior changes need tests. Keep unit tests close to the package boundary in
`tests/`, and use the MCP acceptance test for end-to-end tool lifecycle
changes. Test data should use temporary directories and must not write to a
contributor's real `~/.good-ai` directory.

Use the existing TypeScript and Prettier configuration. Keep public exports
intentional: add an export to a package barrel only when it is part of the
supported package API. Package dependencies belong in the package manifest;
shared development-tool versions belong in `pnpm-workspace.yaml`'s catalog.

## Pull requests

Before opening a pull request:

1. Explain the user-visible behavior and the relevant PRD requirement.
2. Include tests for changed behavior and document any product decision.
3. Run typechecks, tests, build, and formatting checks.
4. Call out migration, storage, privacy, or compatibility implications.
5. Keep the change focused and update README or examples when behavior changes.

Never include real credentials, private conversation content, database files,
or generated `dist/` output in a pull request.
