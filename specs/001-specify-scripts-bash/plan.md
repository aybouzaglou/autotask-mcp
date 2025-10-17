# Implementation Plan: Ticket Update Reliability

**Branch**: `001-specify-scripts-bash` | **Date**: 2025-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-specify-scripts-bash/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Restore reliable Autotask ticket updates via the MCP server so assistants can reassign resources, change status and priority, and post internal/external notes with clear failure feedback. We will refine the existing `update_ticket` workflow, add guarded note creation pathways, tighten input validation, and improve logging plus error surfaces to eliminate current HTTP 405 responses.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.3 targeting Node.js 18 (existing MCP server stack)  
**Primary Dependencies**: `@modelcontextprotocol/sdk`, `autotask-node`, `axios`, `winston`  
**Storage**: N/A (Autotask SaaS as system of record)  
**Testing**: Jest with `npm test`, lint coverage via `npm run lint`  
**Target Platform**: MCP server running over stdio/HTTP transports on Node.js backend  
**Project Type**: Single backend project (`src/` mono)  
**Performance Goals**: Ticket updates (assignment/status/priority/notes) complete within 5 seconds round-trip and succeed ≥95% without retries  
**Constraints**: Backend-only scope, sanitized structured logging, maintain ≥80% coverage with 100% on ticket update critical paths  
**Scale/Scope**: Service desk assistants performing dozens of ticket updates per hour across multiple tenants

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Backend-Only MCP Charter: Work limited to updating existing handlers in `src/handlers`/`src/services`; no new services or UI artefacts introduced.
- Autotask Data Stewardship: Use sanctioned Autotask REST endpoints for Tickets, Assignments, and Notes; validate IDs, redact sensitive payload fields in logs, and respect publish levels for notes.
- Quality Gates & Test Discipline: Expand Jest coverage with unit/integration tests covering success and failure flows; enforce `npm run lint` and `npm test` in CI with ≥80% overall and 100% coverage on ticket-update paths.
- Structured Observability & Error Hygiene: Enhance `winston` logs with request metadata (sans PII) and propagate structured error responses to assistant clients; capture Autotask error codes for diagnostics.
- Secure Configuration & Operational Readiness: Reuse existing environment variables; document required Autotask permissions and update README/Smithery notes if new scopes are needed (currently none anticipated).

## Project Structure

### Documentation (this feature)

```
specs/001-specify-scripts-bash/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
src/
├── handlers/
│   └── ticket.handler.ts
├── services/
│   └── autotask.service.ts
├── mcp/
│   └── server.ts
└── utils/
    └── logger.ts

tests/
├── integration/
│   └── tickets.integration.test.ts
└── unit/
    └── handlers/
        └── ticket.handler.test.ts
```

**Structure Decision**: Extend existing single-project backend layout; focus changes in ticket handler/service files and add complementary Jest tests under `tests/unit` and `tests/integration`.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | - | - |
