# AI usage

> Draft — the sections marked _TODO_ need your own account of what you reviewed, changed and decided.

## AI-assisted parts

The initial scaffold was generated with Claude Code (Claude Opus 5.5):

- Monorepo layout (npm workspaces), `docker-compose.yml`, root scripts
- Backend: config validation, user schema/service, auth module (DTOs, service, guard, controller), DTO unit tests
- Frontend: API client, auth context, route guards, sign-up / sign-in / application pages, styles
- `README.md`

## Effective prompts / approaches

- Giving the AI the full requirements.

## What had to be corrected or reworked

- The `.env` file generated through Windows PowerShell 5.1 was written with a UTF-8 BOM; it was rewritten without one.
- _TODO_

## Decisions made differently from the AI's suggestions

- Reviewing code
- Making manual tests
