# AGENTS.md

## Project overview

Good-AI is an open-source, local-first memory layer for successful AI
interactions. It stores reusable experiences locally and exposes persistence
and retrieval through an MCP server. Good-AI does not provide an AI model,
call hosted AI APIs, or require remote services or API keys for its first
version.

## Repository guidance

- Treat `PRD.md` as the product source of truth and keep implementation
  decisions consistent with it.
- Preserve the local-first architecture: shared local storage, currently
  intended to be SQLite, with no required hosted backend.
- Keep model reasoning and success detection in the client skill. The MCP
  server should provide deterministic validation, storage, search, retrieval,
  update, and delete operations rather than LLM-based classification.
- Store reusable lessons and structured experiences, not raw conversations,
  unless a future requirement explicitly changes that boundary.
- Prefer small, composable changes and avoid adding external services or API
  dependencies without a clear product requirement.

## Working practices

- Read the relevant sections of `PRD.md` before implementing product behavior.
- Inspect the existing repository and preserve unrelated user changes.
- Add or update tests for behavior changes when a test framework exists.
- Run the project’s available validation commands before handing off work, and
  report any commands that could not be run.
- Keep documentation and configuration examples synchronized with behavior.
- Keep production code under each package's `src/` directory and tests under
  that package's `tests/` directory; do not mix test files into production
  modules.
- Organize core code by responsibility (`models`, `schemas`, `services`,
  `search`, `privacy`, `storage`, and `utils`) and import implementation
  modules directly instead of creating circular dependencies through barrels.
- Keep package dependencies declared in the package that uses them; shared
  tool versions belong in the pnpm workspace catalog.
- Use `.agents/skills/issue-execution/SKILL.md` for the one-issue-at-a-time
  GitHub workflow and `.agents/commands/` for the local issue workflow prompts.
- Prefer dependency-safe issue order over GitHub issue-number order; ask for
  clarification only when a decision materially changes the implementation.

## Change boundaries

- Do not introduce network calls to AI providers into Good-AI.
- Do not silently add telemetry, cloud persistence, or mandatory credentials.
- Do not delete or rewrite user files without explicit instruction.
- If the implementation requires a product decision not covered by the PRD,
  call out the decision and choose the smallest reversible approach.
