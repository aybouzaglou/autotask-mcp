# Tasks: MCP Best Practices Compliance

**Feature Branch**: `004-mcp-best-practices-review`
**Input**: Design documents from `/specs/004-mcp-best-practices-review/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are NOT explicitly requested in the specification. Test tasks are included for validation and quality assurance only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. All 40+ tools will be migrated in a systematic, phased approach.

**Constitution Alignment**:
- All tasks confined to existing backend TypeScript MCP server (src/handlers/, src/utils/, src/types/)
- No new Autotask entities/endpoints; only refactoring tool registration and validation
- Maintain ≥80% overall coverage and 100% on tool registration and validation paths
- Include logging, error handling, and documentation updates for operational readiness

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [X] T001 Install zod-to-json-schema dependency via package.json
- [X] T002 [P] Create src/utils/validation/ directory structure
- [X] T003 [P] Create src/utils/formatting/ directory structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create common validation schemas in src/utils/validation/common.schemas.ts
- [X] T005 [P] Extend McpTool interface with annotations field in src/types/mcp.ts
- [X] T006 [P] Create validation error formatter utility in src/utils/validation/error-formatter.ts
- [X] T007 [P] Create character limit enforcement utility in src/utils/formatting/truncation.ts
- [X] T008 [P] Create base Markdown formatter class in src/utils/formatting/base.formatter.ts
- [X] T009 Create validation helper functions in src/utils/validation/index.ts
- [X] T010 [P] Create formatting helper functions in src/utils/formatting/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Multi-Server Tool Discovery (Priority: P1) 🎯 MVP

**Goal**: Enable Autotask MCP server to coexist with other MCP servers without tool name conflicts by adding `autotask_` prefix to all tool names.

**Independent Test**: Configure two MCP servers with overlapping tool names in Claude Desktop. Verify both servers' tools are accessible with no ambiguity using the `autotask_` prefix.

### Implementation for User Story 1

- [X] T011 [US1] Identify all 40+ tool names in src/handlers/tool.handler.ts (line scan)
- [X] T012 [US1] Rename all tool names with `autotask_` prefix in listTools() method in src/handlers/tool.handler.ts
- [X] T013 [US1] Update all tool name references in callTool() switch cases in src/handlers/tool.handler.ts
- [X] T014 [US1] Add tool name validation helper isValidAutotaskToolName() in src/utils/validation/tool-name.validator.ts
- [X] T015 [US1] Update README.md with new tool names and examples
- [X] T016 [US1] Update Claude Desktop configuration examples in docs/ with new tool names
- [X] T017 [US1] Create MIGRATION.md guide for users upgrading from pre-compliance versions

**Checkpoint**: All tools now have `autotask_` prefix and can coexist with other MCP servers

---

## Phase 4: User Story 2 - LLM Understanding of Tool Behavior (Priority: P2)

**Goal**: Add comprehensive tool annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint) to guide LLM decision-making about when to request user permission.

**Independent Test**: Observe Claude's behavior when calling annotated tools. Read-only tools should execute with minimal friction, while destructive tools should prompt for confirmation.

### Implementation for User Story 2

- [X] T018 [P] [US2] Create tool annotation constants in src/utils/validation/tool-annotations.ts
- [X] T019 [P] [US2] Create annotation validation helper validateAnnotations() in src/utils/validation/tool-annotations.ts
- [X] T020 [US2] Add annotations to all search/list tools (readOnlyHint: true, openWorldHint: true) in src/handlers/tool.handler.ts
- [X] T021 [US2] Add annotations to all get/read tools (readOnlyHint: true, openWorldHint: true) in src/handlers/tool.handler.ts
- [X] T022 [US2] Add annotations to all create tools (readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true) in src/handlers/tool.handler.ts
- [X] T023 [US2] Add annotations to all update tools (readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true) in src/handlers/tool.handler.ts
- [X] T024 [US2] Add annotations to test_connection tool (readOnlyHint: true, openWorldHint: true) in src/handlers/tool.handler.ts
- [X] T025 [US2] Validate all 40+ tools have complete annotations using validateAnnotations() helper

**Checkpoint**: All tools have proper MCP annotations guiding LLM behavior

---

## Phase 5: User Story 4 - Input Validation with Clear Feedback (Priority: P2)

**Goal**: Implement Zod runtime validation with strict mode for all tool parameters, providing immediate, actionable feedback for invalid inputs.

**Independent Test**: Call tools with invalid parameters (e.g., negative pageSize, invalid email format) and verify clear error messages with guidance.

**Note**: User Story 4 is implemented before User Story 3 because validation is a prerequisite for response formatting (validates response_format parameter).

### Validation Schema Creation

- [X] T026 [P] [US4] Create Company tool schemas in src/utils/validation/company.schemas.ts
- [X] T027 [P] [US4] Create Contact tool schemas in src/utils/validation/contact.schemas.ts
- [X] T028 [P] [US4] Create Ticket tool schemas in src/utils/validation/ticket.schemas.ts
- [X] T029 [P] [US4] Create Project tool schemas in src/utils/validation/project.schemas.ts
- [X] T030 [P] [US4] Create Time Entry tool schemas in src/utils/validation/time.schemas.ts
- [X] T031 [P] [US4] Create Resource tool schemas in src/utils/validation/resource.schemas.ts
- [X] T032 [P] [US4] Create Contract tool schemas in src/utils/validation/contract.schemas.ts
- [X] T033 [P] [US4] Create Quote tool schemas in src/utils/validation/quote.schemas.ts
- [X] T034 [P] [US4] Create Task tool schemas in src/utils/validation/task.schemas.ts
- [X] T035 [P] [US4] Create Note tool schemas in src/utils/validation/note.schemas.ts
- [X] T036 [P] [US4] Create Attachment tool schemas in src/utils/validation/attachment.schemas.ts

### Tool Handler Validation Integration

- [X] T037 [US4] Add handleValidationError() method to ToolHandler class in src/handlers/tool.handler.ts
- [X] T038 [US4] Integrate Zod validation for Company tools in callTool() switch cases in src/handlers/tool.handler.ts
- [X] T039 [US4] Integrate Zod validation for Contact tools in callTool() switch cases in src/handlers/tool.handler.ts
- [X] T040 [US4] Integrate Zod validation for Ticket tools in callTool() switch cases in src/handlers/tool.handler.ts
  - **Note**: `autotask_update_ticket` requires TWO-LAYER VALIDATION (Constitution Section 6):
    - Layer 1: Zod schema validation for type checking (TicketSchemas.UpdateTicket)
    - Layer 2: Business validation via existing TicketUpdateValidator (PRESERVE)
  - See `.specify/memory/learnings/two-layer-validation.md` for implementation pattern
  - All other ticket tools use Zod-only validation
  - ✅ **VERIFIED**: Both layers implemented correctly, business validators preserved
- [X] T041 [US4] Integrate Zod validation for Project tools in callTool() switch cases in src/handlers/tool.handler.ts
- [X] T042 [US4] Integrate Zod validation for Time Entry tools in callTool() switch cases in src/handlers/tool.handler.ts
- [X] T043 [US4] Integrate Zod validation for Resource tools in callTool() switch cases in src/handlers/tool.handler.ts
- [X] T044 [US4] Integrate Zod validation for Contract tools in callTool() switch cases in src/handlers/tool.handler.ts
- [X] T045 [US4] Integrate Zod validation for Quote tools in callTool() switch cases in src/handlers/tool.handler.ts
- [X] T046 [US4] Integrate Zod validation for Task tools in callTool() switch cases in src/handlers/tool.handler.ts
- [X] T047 [US4] Integrate Zod validation for Note tools in callTool() switch cases in src/handlers/tool.handler.ts
  - **Note**: `autotask_create_ticket_note` requires TWO-LAYER VALIDATION (Constitution Section 6):
    - Layer 1: Zod schema validation for type checking (NoteSchemas.CreateTicketNote)
    - Layer 2: Business validation via existing TicketUpdateValidator.validateTicketNote() (PRESERVE)
  - Includes content sanitization (line ending normalization, whitespace trimming)
  - See `.specify/memory/learnings/two-layer-validation.md` for implementation pattern
  - All other note tools use Zod-only validation
  - ✅ **VERIFIED**: Both layers implemented correctly, content sanitization preserved
- [X] T048 [US4] Integrate Zod validation for Attachment tools in callTool() switch cases in src/handlers/tool.handler.ts

### JSON Schema Generation

- [X] T049 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Company tools in src/handlers/tool.handler.ts
- [X] T050 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Contact tools in src/handlers/tool.handler.ts
- [X] T051 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Ticket tools in src/handlers/tool.handler.ts
- [X] T052 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Project tools in src/handlers/tool.handler.ts
- [X] T053 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Time Entry tools in src/handlers/tool.handler.ts
- [X] T054 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Resource tools in src/handlers/tool.handler.ts
- [X] T055 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Contract tools in src/handlers/tool.handler.ts
- [X] T056 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Quote tools in src/handlers/tool.handler.ts
- [X] T057 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Task tools in src/handlers/tool.handler.ts
- [X] T058 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Note tools in src/handlers/tool.handler.ts
- [X] T059 [US4] Generate JSON Schema from Zod schemas using zodToJsonSchema for all Attachment tools in src/handlers/tool.handler.ts

**Checkpoint**: ✅ **COMPLETE** - Phase 5 (User Story 4: Input Validation) fully complete:
- All tools have Zod validation with strict mode and clear error messages
- JSON Schema automatically generated from Zod schemas using `zodToJsonSchema` at runtime
- Two-layer validation successfully implemented for `autotask_update_ticket` and `autotask_create_ticket_note` per Constitution Section 6
- Single source of truth: Zod schemas define both validation logic and MCP JSON Schema

---

## Phase 6: User Story 3 - Response Format Flexibility (Priority: P3) ❌ CANCELLED

**Status**: CANCELLED - Markdown formatting not needed. MCP architecture: Tool → JSON → LLM processes → LLM generates human-friendly output. No UI displays raw tool responses to users.

**Original Goal**: Support dual response formats (JSON/Markdown) for all search/list tools to enable both programmatic processing and human-readable output.

**Cancellation Rationale**: 
- MCP protocol architecture shows tool responses go directly to LLMs, not end users
- LLMs consume structured JSON more effectively than Markdown
- No display layer exists in MCP that would render Markdown to humans
- Feature provides no value in actual deployment model

**Original Independent Test**: Call search tools with `response_format: "markdown"` and verify human-readable output with proper formatting.

### Markdown Formatter Implementation (CANCELLED)

- [CANCELLED] T060 [P] [US3] Create Company Markdown formatter in src/utils/formatting/company.formatter.ts
- [CANCELLED] T061 [P] [US3] Create Contact Markdown formatter in src/utils/formatting/contact.formatter.ts
- [CANCELLED] T062 [P] [US3] Create Ticket Markdown formatter in src/utils/formatting/ticket.formatter.ts
- [CANCELLED] T063 [P] [US3] Create Project Markdown formatter in src/utils/formatting/project.formatter.ts
- [CANCELLED] T064 [P] [US3] Create Time Entry Markdown formatter in src/utils/formatting/time.formatter.ts
- [CANCELLED] T065 [P] [US3] Create Resource Markdown formatter in src/utils/formatting/resource.formatter.ts
- [CANCELLED] T066 [P] [US3] Create Contract Markdown formatter in src/utils/formatting/contract.formatter.ts
- [CANCELLED] T067 [P] [US3] Create Quote Markdown formatter in src/utils/formatting/quote.formatter.ts
- [CANCELLED] T068 [P] [US3] Create Task Markdown formatter in src/utils/formatting/task.formatter.ts
- [CANCELLED] T069 [P] [US3] Create Note Markdown formatter in src/utils/formatting/note.formatter.ts
- [CANCELLED] T070 [P] [US3] Create Attachment Markdown formatter in src/utils/formatting/attachment.formatter.ts

### Response Format Integration (CANCELLED)

- [CANCELLED] T071 [US3] Create response format factory createResponseFormatter() in src/utils/formatting/response-factory.ts
- [CANCELLED] T072 [US3] Add response_format parameter handling to all Company search tools in src/handlers/tool.handler.ts
- [CANCELLED] T073 [US3] Add response_format parameter handling to all Contact search tools in src/handlers/tool.handler.ts
- [CANCELLED] T074 [US3] Add response_format parameter handling to all Ticket search tools in src/handlers/tool.handler.ts
- [CANCELLED] T075 [US3] Add response_format parameter handling to all Project search tools in src/handlers/tool.handler.ts
- [CANCELLED] T076 [US3] Add response_format parameter handling to all Time Entry search tools in src/handlers/tool.handler.ts
- [CANCELLED] T077 [US3] Add response_format parameter handling to all Resource search tools in src/handlers/tool.handler.ts
- [CANCELLED] T078 [US3] Add response_format parameter handling to all Contract search tools in src/handlers/tool.handler.ts
- [CANCELLED] T079 [US3] Add response_format parameter handling to all Quote search tools in src/handlers/tool.handler.ts
- [CANCELLED] T080 [US3] Add response_format parameter handling to all Task search tools in src/handlers/tool.handler.ts
- [CANCELLED] T081 [US3] Add response_format parameter handling to all Note search tools in src/handlers/tool.handler.ts
- [CANCELLED] T082 [US3] Add response_format parameter handling to all Attachment search tools in src/handlers/tool.handler.ts

---

## Phase 7: User Story 5 - Response Size Management (Priority: P3) ❌ CANCELLED

**Status**: CANCELLED - Character limits unnecessary. Response size already managed via pageSize parameter. Global truncation adds complexity without value since LLMs consume structured JSON efficiently.

**Original Goal**: Enforce 25,000 character limit on all responses with clear truncation guidance to prevent overwhelming LLM context windows.

**Cancellation Rationale**:
- Response size is already controlled via pageSize parameter on search tools
- MCP protocol enforces message size limits automatically at transport layer
- Global truncation would add complexity without addressing real constraints
- LLMs handle large JSON structures efficiently through context management
- Feature marked P3 (lowest priority) in original spec signaled "not blocking"

**Original Independent Test**: Request large result sets and verify truncation at 25,000 characters with helpful guidance message.

### Implementation for User Story 5 (CANCELLED)

- [CANCELLED] T083 [US5] Integrate character limit enforcement for all Company tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T084 [US5] Integrate character limit enforcement for all Contact tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T085 [US5] Integrate character limit enforcement for all Ticket tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T086 [US5] Integrate character limit enforcement for all Project tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T087 [US5] Integrate character limit enforcement for all Time Entry tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T088 [US5] Integrate character limit enforcement for all Resource tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T089 [US5] Integrate character limit enforcement for all Contract tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T090 [US5] Integrate character limit enforcement for all Quote tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T091 [US5] Integrate character limit enforcement for all Task tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T092 [US5] Integrate character limit enforcement for all Note tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T093 [US5] Integrate character limit enforcement for all Attachment tool responses in src/handlers/tool.handler.ts
- [CANCELLED] T094 [US5] Add filter suggestions to truncation guidance based on tool type in src/utils/formatting/truncation.ts

---

## Phase 8: Testing & Validation

**Purpose**: Validate all compliance requirements and maintain quality gates

### Unit Tests

- [X] T095 [P] Create unit tests for common validation schemas in tests/unit/utils/validation/common.schemas.test.ts
- [X] T096 [P] Create unit tests for validation error formatting in tests/unit/utils/validation/error-formatter.test.ts
- [X] T097 [P] Create unit tests for character limit enforcement in tests/unit/utils/formatting/truncation.test.ts
- [X] T098 [P] Create unit tests for base Markdown formatter in tests/unit/utils/formatting/base.formatter.test.ts
- [X] T099 [P] Create unit tests for Company Markdown formatter in tests/unit/utils/formatting/company.formatter.test.ts
- [X] T100 [P] Create unit tests for tool name validation in tests/unit/utils/validation/tool-name.validator.test.ts
- [X] T101 [P] Create unit tests for tool annotations validation in tests/unit/utils/validation/tool-annotations.test.ts

### Integration Tests

- [X] T102 Update existing tool handler integration tests with new tool names in tests/integration/tool-integration.test.ts
- [X] T103 [P] Add integration tests for Zod validation errors in tests/integration/validation-integration.test.ts
- [X] T104 [P] Add integration tests for response format switching in tests/integration/response-format.test.ts
- [X] T105 [P] Add integration tests for character limit truncation in tests/integration/truncation.test.ts
- [X] T106 [P] Add integration tests for tool annotations behavior in tests/integration/annotations.test.ts

### Tool-Specific Validation Tests

- [X] T107 [P] Create validation tests for Company tool schemas in tests/unit/utils/validation/company.schemas.test.ts
- [X] T108 [P] Create validation tests for Contact tool schemas in tests/unit/utils/validation/contact.schemas.test.ts
- [X] T109 [P] Create validation tests for Ticket tool schemas in tests/unit/utils/validation/ticket.schemas.test.ts

### Coverage & Quality Validation

- [X] T110 Run npm test and ensure all tests pass
- [ ] T111 Run npm run test:coverage and verify ≥80% overall coverage
- [ ] T112 Verify 100% coverage on tool registration and validation paths
- [X] T113 Run npm run lint and fix any linting issues
- [X] T114 Run npm run build and ensure TypeScript compilation succeeds

**Checkpoint**: All tests pass, coverage targets met, no linting errors

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and final validation

- [ ] T115 [P] Verify all 40+ tools follow naming convention (autotask_ prefix) via automated check
- [ ] T116 [P] Verify all 40+ tools have complete annotations via automated check
- [ ] T117 [P] Verify all 40+ tools have Zod validation via automated check
- [ ] T118 Update package.json version and changelog
- [ ] T119 Review and update inline code documentation/comments
- [ ] T120 Run quickstart.md validation checklist
- [ ] T121 Final manual testing with Claude Desktop using new tool names
- [ ] T122 Performance validation: Ensure tool execution <100ms for validation errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately ✅
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories ✅
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - 4/7 tasks complete
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) and US1 (Phase 3) - Complete ✅
- **User Story 4 (Phase 5)**: Depends on Foundational (Phase 2) and US1 (Phase 3) - Complete ✅
- **User Story 3 (Phase 6)**: ❌ CANCELLED - Markdown formatting not needed
- **User Story 5 (Phase 7)**: ❌ CANCELLED - Character limits unnecessary
- **Testing (Phase 8)**: Depends on US1, US2, US4 being complete (Phases 3-5)
- **Polish (Phase 9)**: Depends on Testing (Phase 8)

### User Story Dependencies

```
Phase 2 (Foundational) → BLOCKS ALL STORIES ✅
    ↓
Phase 3 (US1: Tool Naming) → BLOCKS US2, US4 (4/7 complete)
    ↓
Phase 4 (US2: Annotations) ✅ → Can proceed in parallel with US4
    ↓
Phase 5 (US4: Validation) ✅ → Complete
    ↓
Phase 8 (Testing & Validation) → Validate US1, US2, US4
    ↓
Phase 9 (Polish & Documentation) → Final delivery
```

**Note**: US3 (Response Format) and US5 (Character Limits) removed from scope - focus on core MCP compliance: naming, annotations, validation. These cancelled features provide no value in MCP's actual architecture where tools return JSON to LLMs.

### Within Each User Story

- **US1**: Tool naming must complete before validation/annotations
- **US2**: Annotations can be added after tool renaming
- **US4**: Schema creation (T026-T036) before handler integration (T037-T048) before JSON Schema generation (T049-T059)
- **US3**: Formatter creation (T060-T070) before response factory (T071) before handler integration (T072-T082)
- **US5**: Must follow US3 completion (needs formatters)

### Parallel Opportunities

**Phase 1 (Setup)**: All 3 tasks can run in parallel

**Phase 2 (Foundational)**: Tasks T006-T010 marked [P] can run in parallel (T004-T005 are prerequisites)

**Phase 4 (US2: Annotations)**: Tasks T018-T019 can run in parallel, then T020-T024 can run in parallel

**Phase 5 (US4: Validation)**:
- Schema creation: T026-T036 (11 tasks) can ALL run in parallel
- Handler integration: T038-T048 (11 tasks) can run in parallel after T037
- JSON Schema generation: T049-T059 (11 tasks) can run in parallel after handler integration

**Phase 6 (US3: Response Format)**:
- Formatter creation: T060-T070 (11 tasks) can ALL run in parallel
- Handler integration: T072-T082 (11 tasks) can run in parallel after T071

**Phase 7 (US5: Character Limits)**: T083-T093 (11 tasks) can run in parallel, T094 after

**Phase 8 (Testing)**: Unit tests T095-T101 can run in parallel, integration tests T102-T106 can run in parallel, validation tests T107-T109 can run in parallel

**Phase 9 (Polish)**: T115-T117 can run in parallel

---

## Parallel Example: User Story 4 (Validation)

```bash
# Launch all schema creation tasks in parallel:
Task T026: "Create Company tool schemas in src/utils/validation/company.schemas.ts"
Task T027: "Create Contact tool schemas in src/utils/validation/contact.schemas.ts"
Task T028: "Create Ticket tool schemas in src/utils/validation/ticket.schemas.ts"
Task T029: "Create Project tool schemas in src/utils/validation/project.schemas.ts"
Task T030: "Create Time Entry tool schemas in src/utils/validation/time.schemas.ts"
Task T031: "Create Resource tool schemas in src/utils/validation/resource.schemas.ts"
Task T032: "Create Contract tool schemas in src/utils/validation/contract.schemas.ts"
Task T033: "Create Quote tool schemas in src/utils/validation/quote.schemas.ts"
Task T034: "Create Task tool schemas in src/utils/validation/task.schemas.ts"
Task T035: "Create Note tool schemas in src/utils/validation/note.schemas.ts"
Task T036: "Create Attachment tool schemas in src/utils/validation/attachment.schemas.ts"

# After T037 completes, launch all handler integration tasks in parallel:
Task T038: "Integrate Zod validation for Company tools"
Task T039: "Integrate Zod validation for Contact tools"
Task T040: "Integrate Zod validation for Ticket tools"
Task T041: "Integrate Zod validation for Project tools"
Task T042: "Integrate Zod validation for Time Entry tools"
Task T043: "Integrate Zod validation for Resource tools"
Task T044: "Integrate Zod validation for Contract tools"
Task T045: "Integrate Zod validation for Quote tools"
Task T046: "Integrate Zod validation for Task tools"
Task T047: "Integrate Zod validation for Note tools"
Task T048: "Integrate Zod validation for Attachment tools"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Tool Naming)
4. Complete Phase 4: User Story 2 (Annotations)
5. **STOP and VALIDATE**: Test tools with new names and annotations
6. Deploy/demo MVP: Multi-server compatibility with LLM behavior hints

**Rationale**: US1 + US2 deliver the core MCP compliance requirements (tool naming + annotations) and are independently valuable.

### Incremental Delivery

1. **Foundation** (Phases 1-2) → Infrastructure ready
2. **MVP** (Phases 3-4: US1 + US2) → Core compliance → Deploy/Demo
3. **Enhanced MVP** (Phase 5: US4) → Add validation → Deploy/Demo
4. **Full Feature** (Phases 6-7: US3 + US5) → Add formatting + limits → Deploy/Demo
5. **Production Ready** (Phases 8-9) → Tests + polish → Final release

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

- **Developer A**: User Story 1 (Tool Naming) → blocking for all
- **After US1**:
  - **Developer A**: User Story 2 (Annotations)
  - **Developer B**: User Story 4 schemas (T026-T036)
- **After US1 + US4 schemas**:
  - **Developer A**: User Story 4 integration (T037-T059)
  - **Developer B**: User Story 3 formatters (T060-T070)
- **After US4 + US3**:
  - **Developer A**: User Story 3 integration (T071-T082)
  - **Developer B**: User Story 5 (T083-T094)
- **Final**: Both developers on Testing (Phase 8) and Polish (Phase 9)

---

## Task Count Summary

- **Phase 1 (Setup)**: 3 tasks ✅
- **Phase 2 (Foundational)**: 7 tasks ✅ (BLOCKING)
- **Phase 3 (US1: Tool Naming)**: 7 tasks (4 complete, 3 remaining)
- **Phase 4 (US2: Annotations)**: 8 tasks ✅
- **Phase 5 (US4: Validation)**: 34 tasks ✅ (11 schemas + 12 integrations + 11 JSON Schema generations)
- **Phase 6 (US3: Response Format)**: 23 tasks ❌ CANCELLED
- **Phase 7 (US5: Character Limits)**: 12 tasks ❌ CANCELLED
- **Phase 8 (Testing)**: 20 tasks
- **Phase 9 (Polish)**: 8 tasks

**Total Original Tasks**: 122 tasks
**Cancelled Tasks**: 35 tasks (23 from US3 + 12 from US5)
**Total Active Tasks**: 87 tasks
**Completed Tasks**: 52 tasks (Phases 1, 2, 4, 5 complete)
**Remaining Tasks**: 35 tasks (3 from US1 naming + 20 testing + 12 polish)

### Status Overview

- ✅ **52 tasks complete** (60% of active work)
- 🔄 **3 tasks in progress** (US1: Tool Naming final tasks)
- ⏳ **32 tasks pending** (Testing and Polish phases)
- ❌ **35 tasks cancelled** (US3 and US5 removed from scope)

### Cancellation Impact

Removing US3 and US5 eliminates 35 tasks (29% of original scope) that provide no value in MCP's architecture:
- **US3 cancelled**: 23 tasks for Markdown formatting (LLMs consume JSON, not Markdown)
- **US5 cancelled**: 12 tasks for character limits (handled by pageSize + MCP protocol limits)

This refocus allows faster completion of core MCP compliance improvements: naming, annotations, and validation.

### Parallel Opportunities (Remaining Work)

- Phase 8 (Testing): 15 parallel tasks
- Phase 9 (Polish): 3 parallel tasks

**Estimated parallel execution time savings**: ~40% reduction with 2-3 developers

---

## Notes

- All 40+ tools in src/handlers/tool.handler.ts must be migrated
- [P] tasks target different files/modules and can run in parallel
- [Story] labels map to spec.md user stories (US1, US2, US3, US4, US5)
- Each user story should be independently testable at its checkpoint
- Commit after each logical group of tasks
- Stop at any checkpoint to validate story independence
- **Breaking Change**: Tool names change requires user migration (documented in MIGRATION.md)
- **Backward Compatibility**: Tool behavior unchanged, only naming and validation added
- **Performance Target**: <100ms for validation errors (no API call), <2s for typical API queries
- **Coverage Target**: ≥80% overall, 100% on tool registration and validation paths
