# Autotask MCP Coding Standards

> Last updated: September 17, 2025

These standards capture the current conventions in the backend-only Autotask MCP server. Follow them when extending the codebase or generating code with AI agents.

## General Principles
- **Backend only:** Do not introduce frontend code or UI build pipelines—this project is an MCP server exposing Autotask APIs.
- **Prefer existing patterns:** Mirror implementations found in `src/services/autotask.service.ts`, `src/mcp/server.ts`, and `src/handlers/*` when adding features.
- **Keep responses lean:** Service helpers should trim payloads and document large-result caveats, continuing the approach already used for tickets and projects.

## TypeScript & Project Layout
- Target ECMAScript 2020 modules (`tsconfig.json`). All new files belong under `src/`.
- Enable strict typing: honour `noImplicitAny`, `noUnusedLocals`, and `exactOptionalPropertyTypes`. Address compiler errors instead of suppressing.
- Export named types/interfaces from `src/types/` when they are reused across modules; avoid circular imports.
- Keep synchronous startup work minimal; defer heavy Autotask calls using existing lazy-init helpers in `AutotaskService`.

## Error Handling & Logging
- Use `winston` (`src/utils/logger.ts`) for all logs. Avoid `console.log`.
- Wrap Autotask API errors with contextual information but avoid leaking sensitive credentials.
- When a REST capability is unavailable, prefer the existing pattern of throwing descriptive `UnsupportedOperationError` instances.

## MCP Handler Conventions
- Tool handlers return JSON strings that can be parsed by the enhanced wrapper. Maintain the `{ isError, data, error }` contract used in `src/handlers/tool.handler.ts`.
- Resource handlers must enforce pagination caps and refuse template URIs, matching `AutotaskResourceHandler`.
- When adding transports, funnel configuration through `AutotaskMcpServer.start` and extend `TransportConfig` rather than coupling directly to SDK APIs.

## Testing & Quality
- Add unit tests under `tests/` mirroring the existing Jest setup. Use `ts-jest` for TypeScript test files.
- For Autotask integrations that require live credentials, mark tests with explicit skips or environment guards to keep CI stable.
- Run `npm run lint` and `npm test` before submitting changes; fix lint warnings instead of ignoring them.

## Documentation Expectations
- Update `docs/brownfield-architecture.md` when architectural changes are significant (new transports, major Autotask coverage).
- Keep this standards document, `tech-stack.md`, and `source-tree.md` aligned with actual project state.

Following these guidelines maintains consistency with the current production code and prevents accidental scope creep into unsupported frontend work.
