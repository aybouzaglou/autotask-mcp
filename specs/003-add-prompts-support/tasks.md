# Tasks: Autotask MCP Prompt Catalog

**Input**: Design documents from `/specs/003-add-prompts-support/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include targeted Jest integration and unit checks to preserve ≥80% coverage and validate MCP prompt contracts.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Constitution Alignment**:
- Keep all tasks within the backend TypeScript MCP server footprint; no new runtimes or UI layers.
- Reference Autotask entities (tickets, companies, contacts, time entries) only via approved services and sanitize sensitive data.
- Maintain lint/test/coverage gates (≥80% overall, 100% on new prompt handlers) with explicit validation tasks.
- Extend logging and documentation so prompt operations remain observable and operationally ready.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish configuration and documentation scaffolding for the prompt catalog.

- [ ] T001 Create initial prompt catalog configuration scaffold in `config/prompts.yaml`
- [ ] T002 Document prompt catalog governance and editing workflow in `docs/prompts.md`
- [ ] T003 Update Smithery profile to advertise prompts capability in `smithery.yaml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before implementing any user story.

- [ ] T004 Implement `PromptCatalogService` skeleton with configuration loading in `src/services/prompts/prompt.catalog.service.ts`
- [ ] T005 [P] Add schema validation helpers for prompt definitions in `src/services/prompts/prompt.validators.ts`
- [ ] T006 [P] Export prompt services through module barrel in `src/services/prompts/index.ts`
- [ ] T007 Wire prompt capability registration hooks (list/get placeholders) in `src/mcp/server.ts`

**Checkpoint**: Prompt infrastructure ready—user story execution can start.

---

## Phase 3: User Story 1 - Browse Prompt Catalog (Priority: P1) 🎯 MVP

**Goal**: Serve a curated prompt catalog via `prompts/list` with rich metadata.

**Independent Test**: Connect Smithery or Continue, call `prompts/list`, and observe ≥3 prompts with correct metadata and inactive entries omitted.

### Tests for User Story 1

- [ ] T008 [P] [US1] Author catalog validation/unit tests covering active/inactive prompts in `tests/unit/prompt.catalog.service.spec.ts`
- [ ] T009 [P] [US1] Add integration test for `prompts/list` metadata contract in `tests/integration/prompts.spec.ts`

### Implementation for User Story 1

- [ ] T010 [US1] Load prompts from YAML with active filtering and metadata mapping in `src/services/prompts/prompt.catalog.service.ts`
- [ ] T011 [P] [US1] Surface prompt summaries to server handlers in `src/services/prompts/prompt.catalog.service.ts`
- [ ] T012 [US1] Implement `prompts/list` handler wiring with error handling in `src/mcp/server.ts`
- [ ] T013 [US1] Update prompt catalog reference guide with list usage steps in `docs/prompts.md`

**Checkpoint**: `prompts/list` delivers discoverable catalog meeting MVP requirements.

---

## Phase 4: User Story 2 - Draft Ticket Update Prompt (Priority: P2)

**Goal**: Deliver contextual instructions for ticket update prompts via `prompts/get` with argument validation.

**Independent Test**: Invoke `prompts/get` with valid/invalid ticket ids and verify contextualized instructions or precise argument errors.

### Tests for User Story 2

- [ ] T014 [P] [US2] Extend integration coverage for `prompts/get` success and error flows in `tests/integration/prompts.spec.ts`
- [ ] T015 [P] [US2] Add unit tests for argument validation and context assembly in `tests/unit/prompt.catalog.service.spec.ts`

### Implementation for User Story 2

- [ ] T016 [US2] Implement argument validation and structured MCP error responses in `src/services/prompts/prompt.catalog.service.ts`
- [ ] T017 [US2] Fetch and sanitize Autotask ticket/company data for prompts in `src/services/prompts/prompt.catalog.service.ts`
- [ ] T018 [US2] Wire `prompts/get` handler, returning instructions plus context blocks in `src/mcp/server.ts`
- [ ] T019 [US2] Add structured logging for prompt retrieval paths in `src/utils/logger.ts`

**Checkpoint**: Agents receive guided ticket update prompts with resilient error handling.

---

## Phase 5: User Story 3 - Receive Prompt Catalog Updates (Priority: P3)

**Goal**: Notify clients of catalog changes and harden config error handling.

**Independent Test**: Change prompt definitions, restart server, and confirm `prompts/list_changed` notification plus graceful handling of invalid entries.

### Tests for User Story 3

- [ ] T020 [P] [US3] Verify list-changed notifications and invalid prompt skips in `tests/integration/prompts.spec.ts`

### Implementation for User Story 3

- [ ] T021 [US3] Emit `prompts/list_changed` notifications on startup/reload in `src/mcp/server.ts`
- [ ] T022 [P] [US3] Implement catalog reload/refresh hook for future dynamic updates in `src/services/prompts/prompt.catalog.service.ts`
- [ ] T023 [US3] Harden invalid prompt logging and fallback messaging in `src/services/prompts/prompt.catalog.service.ts`
- [ ] T024 [US3] Document catalog change process and operator checklist in `docs/prompts.md`

**Checkpoint**: Catalog updates propagate automatically without manual troubleshooting.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, docs, and release preparation.

- [ ] T025 [P] Refresh quickstart instructions reflecting prompt workflows in `specs/003-add-prompts-support/quickstart.md`
- [ ] T026 Execute lint and test suite (`npm run lint && npm test`) documented in `package.json`
- [ ] T027 [P] Capture release notes summarizing prompt capability launch in `CHANGELOG.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 → Phase 2**: Setup must finish before foundational work.
- **Phase 2 → User Stories**: Foundational infrastructure (Phase 2) blocks all user stories.
- **User Stories**: US1 (Phase 3) is MVP and should complete before US2 (Phase 4) and US3 (Phase 5); US2 and US3 can start once Phase 2 is done if resources allow.
- **Phase 6**: Runs after desired user stories are complete.

### User Story Dependencies
- **US1 (P1)**: Depends on Phase 2 completion; no other story dependencies.
- **US2 (P2)**: Depends on Phase 2 and reuses catalog service from US1; avoid breaking US1 flows.
- **US3 (P3)**: Depends on Phase 2 plus notification hooks introduced in US1/US2.

### Within Story Execution
- Write/extend tests (T008–T009, T014–T015, T020) before coding respective features.
- Complete service logic before wiring server handlers.
- Update documentation/logging last within each story to reflect implemented behavior.

### Parallel Opportunities
- Tasks marked **[P]** (T005, T006, T009, T011, T014, T015, T020, T022, T025, T027) can proceed concurrently once their dependencies are satisfied.
- Different user stories (US2, US3) can progress in parallel after Phase 2 when separate engineers are available.

---

## Parallel Example: User Story 1

```bash
# Parallelizable work items after Phase 2
npm test -- tests/unit/prompt.catalog.service.spec.ts   # T008
npm test -- tests/integration/prompts.spec.ts           # T009
# Implementation can also split:
# - Metadata mapping (T011)
# - Handler wiring (T012)
```

---

## Implementation Strategy

### MVP First (User Story 1)
1. Complete Phase 1 and Phase 2 to enable prompt infrastructure.
2. Deliver Phase 3 (US1) and validate `prompts/list` end-to-end.
3. Ship as MVP once catalog browsing works and tests pass.

### Incremental Delivery
1. After MVP, implement Phase 4 (US2) for contextual prompt responses.
2. Follow with Phase 5 (US3) to automate catalog updates.
3. Use Phase 6 tasks to finalize documentation, QA, and release notes.

### Team Parallelization
- One engineer can focus on US1 (list), another on US2 (get), and a third on US3 (notifications) once Phase 2 completes.
- Shared resources (docs/logging) should coordinate through Phase 6 to avoid conflicts.

---

## Notes
- Maintain sanitized logging—never emit Autotask secrets or full payloads.
- Keep prompt definitions declarative so future updates require only YAML edits.
- After completing each phase, run targeted Jest suites to ensure regressions are caught early.
