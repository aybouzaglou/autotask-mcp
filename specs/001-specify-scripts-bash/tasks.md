# Tasks: Ticket Update Reliability

**Input**: Design documents from `/specs/001-specify-scripts-bash/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Write targeted unit/integration tests where noted for critical ticket update paths. Ensure test tasks run before implementation tasks within each story phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

**Constitution Alignment**:
- Keep all work inside the existing backend TypeScript MCP server (`src/`); do not add new runtimes or frontends.
- Interact with Autotask strictly through approved REST endpoints respecting publish levels and data minimization.
- Maintain ≥80% overall test coverage and 100% coverage on ticket update flows via `npm run lint` and `npm test`.
- Enhance structured logging without exposing secrets; map Autotask failures to actionable responses.
- Reuse existing environment variables and document any new operational requirements in project docs.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Seed ticket metadata fixtures for tests in `tests/setup.ts` to expose cached status/priority helpers.
- [X] T002 Create integration test scaffold in `tests/integration/ticket-updates.integration.test.ts` with placeholder describe blocks.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T003 Implement metadata cache module in `src/services/ticket-metadata.cache.ts` to load resources/statuses/priorities with refresh scheduling.
- [X] T004 Integrate metadata cache bootstrap and refresh wiring inside `AutotaskService` initialization in `src/services/autotask.service.ts`.
- [X] T005 Add ticket update validation and request builder utilities in `src/services/ticket-update.validator.ts`.
- [X] T006 Introduce structured error mapper scaffold in `src/utils/error-mapper.ts` returning `{ code, message, guidance }`.

**Checkpoint**: Metadata caching, validation helpers, and error scaffolding are ready for story work.

---

## Phase 3: User Story 1 – Dispatch updates core ticket fields (Priority: P1) 🎯 MVP

**Goal**: Allow coordinators to reassign tickets and adjust status/priority through the assistant without leaving Autotask in an inconsistent state.  
**Independent Test**: From the MCP client, update a ticket’s assigned resource, status, and priority; verify Autotask reflects all changes and tests in `tests/integration/ticket-updates.integration.test.ts` pass.

### Tests for User Story 1

- [X] T007 [P] [US1] Author failing unit specs covering combined field updates in `tests/unit/tool-handler.update-ticket.test.ts`.
- [X] T008 [P] [US1] Expand integration coverage for status/priority/assignment updates in `tests/integration/ticket-updates.integration.test.ts`.

### Implementation for User Story 1

- [X] T009 [US1] Refine `updateTicket` to build metadata-driven PATCH payloads with concurrency token support in `src/services/autotask.service.ts`.
- [X] T010 [US1] Apply validator and new assignment argument handling within the `update_ticket` branch of `src/handlers/tool.handler.ts`.
- [X] T011 [US1] Document updated ticket tool semantics in `src/mcp/server.ts` (tool descriptions and schema hints).
- [X] T012 [US1] Extend ticket type definitions to expose assignment/status/priority update shapes in `src/types/autotask.ts`.

**Checkpoint**: Ticket field updates succeed end-to-end with validation and tests.

---

## Phase 4: User Story 2 – Technicians add contextual notes (Priority: P1)

**Goal**: Allow technicians to submit internal and external notes with correct visibility directly via the assistant.  
**Independent Test**: Post one internal and one external note through the assistant; confirm Autotask visibility flags and see passing scenarios in `tests/integration/ticket-updates.integration.test.ts`.

### Tests for User Story 2

- [X] T013 [P] [US2] Add unit tests validating note visibility and length enforcement in `tests/unit/tool-handler.create-ticket-note.test.ts`.
- [X] T014 [P] [US2] Extend integration coverage for internal vs external notes in `tests/integration/ticket-updates.integration.test.ts`.

### Implementation for User Story 2

- [X] T015 [US2] Enforce publish level and length checks in `createTicketNote` within `src/services/autotask.service.ts`.
- [X] T016 [US2] Add note sanitization helpers to `src/services/ticket-update.validator.ts` for internal/external payloads.
- [X] T017 [US2] Update note handling branch to apply validator output and structured errors in `src/handlers/tool.handler.ts`.

**Checkpoint**: Notes created via assistant honor visibility settings with validated payloads.

---

## Phase 5: User Story 3 – Operators receive actionable errors (Priority: P2)

**Goal**: Surface clear, actionable feedback when Autotask rejects updates so operators can self-correct quickly.  
**Independent Test**: Trigger invalid status and permission errors via the assistant; observe mapped guidance in responses and logs while `tests/unit/utils/error-mapper.test.ts` passes.

### Tests for User Story 3

- [X] T018 [P] [US3] Create unit coverage for Autotask failure mappings in `tests/unit/utils/error-mapper.test.ts`.

### Implementation for User Story 3

- [X] T019 [US3] Implement detailed error mappings for common Autotask failures in `src/utils/error-mapper.ts`.
- [X] T020 [US3] Route ticket update and note creation failures through the mapper in `src/services/autotask.service.ts`.
- [X] T021 [US3] Propagate structured error responses and correlation IDs back to MCP clients in `src/handlers/tool.handler.ts`.
- [X] T022 [US3] Enhance logging to emit sanitized ticket metadata and guidance codes in `src/utils/logger.ts`.
- [X] T023 [US3] Document troubleshooting steps and expected error responses in `specs/001-specify-scripts-bash/quickstart.md`.

**Checkpoint**: Operators receive actionable errors; logs capture sanitized diagnostics.

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T024 Summarize ticket update reliability changes in `CHANGELOG.md`.
- [X] T025 Execute lint and full Jest suites via scripts listed in `package.json`, confirming coverage thresholds.

---

## Phase N+1: Telemetry & Measurement

- [X] T026 Capture per-attempt structured logs for ticket updates and note creation (success and failure) in `src/services/autotask.service.ts` and `src/handlers/tool.handler.ts`, ensuring sanitized payload metadata and Autotask response details flow through `src/utils/logger.ts`.
- [X] T027 Extend `tests/integration/ticket-updates.integration.test.ts` to assert logging/metrics hooks fire with status, priority, assignment, and note operations, covering FR-006 and SC-001/SC-002 paths.
- [X] T028 Document operational runbook entries in `specs/001-specify-scripts-bash/quickstart.md` for monitoring 95% success rate, <5s note visibility, and tracking the 50% manual console reduction metric.

---

## Dependencies & Execution Order

| Predecessor | Successor | Rationale |
|-------------|-----------|-----------|
| T001–T006 | T007–T017 | Metadata cache, validators, and error scaffolds must exist before implementing story logic |
| T007–T012 (US1) | T013–T017 (US2) | Note work depends on validated update pipeline from US1 |
| T013–T017 (US2) | T018–T023 (US3) | Error mapping enhances both update and note flows established earlier |
| T018–T023 | T024–T028 | Observability, polish, and telemetry finish after functional changes land |

- **Story Order**: US1 (P1) → US2 (P1) → US3 (P2); each remains independently testable once its predecessors finish.
- **Cross-Cutting**: Polish and telemetry tasks T024–T028 wrap up once all user stories close.

---

## Parallel Opportunities

- T007 and T008 can run concurrently with different test targets once foundational utilities exist.
- T013 and T014 operate on distinct test files; execute in parallel after US1 completes.
- T018 may begin after T006, independently of US2 implementation tasks.
- T026 and T027 can pair once US3 logging hooks land, with doc updates (T028) trailing in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Finish Setup + Foundational phases (T001–T006).
2. Deliver US1 tasks T007–T012 to restore ticket field updates.
3. Validate via integration tests before proceeding to additional stories.

### Incremental Delivery
1. Complete MVP (US1) and release if urgent.
2. Layer US2 tasks T013–T017 to enable note handling.
3. Add US3 tasks T018–T023 for error experience improvements.
4. Finalize with polish and telemetry tasks (T024–T028).

### Parallel Team Strategy
1. One contributor finalizes foundational work while another seeds test scaffolds.
2. Assign separate developers to US1 and US2 once foundation merges; US3 can begin after validator and mapper scaffolds (T005–T006) are ready.
3. Combine for polish tasks, telemetry instrumentation, and final regression.
