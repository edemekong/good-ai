---
name: issue-execution
description: Execute the Good-AI GitHub backlog one dependency-aware issue at a time, including clarification, implementation, validation, delegation handoff, and issue status updates.
---

# Issue execution

Use this skill when working on a Good-AI GitHub issue in `edemekong/good-ai`.

## Operating contract

- Work on one implementation issue at a time.
- Use the PRD and repository `AGENTS.md` as the product and engineering source of truth.
- Prefer dependency order over GitHub issue-number order. Start with foundation work, then core schema/storage, search/services, MCP, CLI/integration, skill, security, tests, documentation, and release work.
- Before coding, inspect the issue, current repository state, related issues, and existing implementation.
- Ask the user only when an unresolved choice would materially change the design, public API, security/privacy behavior, or external integration. Otherwise choose the smallest reversible implementation and record the assumption.
- Keep changes scoped to the active issue. Do not silently fix unrelated backlog items.
- Validate proportionally: run focused tests first, then the full available checks before handoff.
- When the issue is complete, summarize the change, tests, assumptions, and follow-up work; update the GitHub issue with a concise completion comment and close it only when the user has authorized issue closure through the current workflow.

## Delegation and handoff

When a task can be delegated, create a self-contained handoff containing:

1. issue number and title
2. exact scope and non-goals
3. relevant PRD sections and files
4. dependencies and assumptions
5. expected deliverables
6. validation commands
7. reporting format and stop conditions

Delegated work must not expand scope, mutate unrelated files, or make external changes without explicit authorization. Integrate only after reviewing the diff and running validation.

## GitHub workflow

Use `gh` against `edemekong/good-ai` and target `main`. Check existing issues/comments before creating duplicates. Use labels and assign work consistently. Do not create new issues for ordinary implementation subtasks unless the user asks or the work is genuinely outside the active issue.

## Completion checklist

- implementation matches the issue and PRD
- tests or validation cover the changed behavior
- documentation/configuration is synchronized when needed
- no secrets, hosted AI calls, telemetry, or unintended network dependencies were introduced
- working tree changes are understood
- issue status and next dependency are clear
