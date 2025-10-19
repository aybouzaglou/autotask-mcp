# Implementation Plan: MCP Best Practices Compliance

**Branch**: `004-mcp-best-practices-review` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-mcp-best-practices-review/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor all 40+ MCP tools to comply with MCP best practices: add `autotask_` service prefix, implement comprehensive tool annotations, and add Zod runtime validation with strict mode. This is a breaking change for tool names but maintains backward compatibility for behavior. Focus on capabilities that improve LLM consumption of tools (naming, annotations, validation), not on formatting that LLMs don't need (Markdown responses, global character limits).

### Architectural Focus

This implementation prioritizes features that matter in MCP's actual architecture:

**✅ Included (High Value for LLM Consumption):**
- Tool naming with service prefix (prevents conflicts, improves discoverability)
- Comprehensive tool annotations (guides LLM behavior, enables better planning)
- Zod runtime validation (prevents errors early, provides clear feedback)

**❌ Excluded (No Value in MCP Architecture):**
- Markdown response formatting (LLMs consume JSON, not Markdown; no UI displays raw responses)
- Global character limits with truncation (pageSize handles this; MCP protocol enforces limits)

The excluded features were originally marked P3 (lowest priority) and architectural discovery confirmed they provide no benefit in the actual MCP flow: Tool → JSON → LLM processes → LLM generates human-friendly output.

## Architectural Decisions

### Scope Refinement Based on MCP Architecture

During planning, we discovered that two originally planned user stories (US3: Response Format Flexibility, US5: Response Size Management) provide no value in MCP's actual architecture. These have been removed from scope.

#### Decision 1: Remove Markdown Response Formatting (US3)

**Original Intent**: Support dual response formats (JSON/Markdown) for human-readable output

**Discovery**: MCP architecture shows tool responses go to LLMs, not humans
- Flow: Tool → JSON response → LLM processes → LLM generates human-friendly output
- No UI layer displays raw tool responses to users
- LLMs excel at consuming structured JSON and transforming to natural language
- Adding Markdown formatting provides zero value in this architecture

**Decision**: REMOVE US3 (23 tasks cancelled)

**Supporting Evidence**:
- MCP specification shows tools return JSON to LLM clients
- Claude Desktop, Cursor, and other MCP hosts never display raw tool responses
- LLMs have superior natural language generation compared to static Markdown templates
- Original spec marked this P3 (lowest priority) - "not blocking"

#### Decision 2: Remove Global Character Limits (US5)

**Original Intent**: Enforce 25,000 character limit with truncation to prevent overwhelming LLM context

**Discovery**: Response size is already managed; global truncation adds complexity without value
- `pageSize` parameter already controls result set sizes
- MCP protocol enforces message size limits automatically at transport layer
- LLMs handle large JSON structures efficiently through context management
- Global truncation would add complexity without addressing actual constraints

**Decision**: REMOVE US5 (12 tasks cancelled)

**Supporting Evidence**:
- Existing pagination implementation via `pageSize` provides granular control
- MCP protocol has built-in message size limits (~1MB)
- No reported issues with response sizes in production usage
- Original spec marked this P3 (lowest priority) - "not blocking"

#### Impact on Implementation

**Cancelled Work**: 35 tasks (29% of original 122-task scope)
- 23 tasks for Markdown formatting (US3)
- 12 tasks for character limits (US5)

**Remaining Focus**: 87 active tasks across 3 core improvements
- ✅ US1: Tool Naming (4/7 complete) - adds service prefix
- ✅ US2: Tool Annotations (8/8 complete) - guides LLM behavior  
- ✅ US4: Runtime Validation (34/34 complete) - prevents errors early

**Benefit**: Faster delivery of features that actually improve LLM consumption of tools, without wasting effort on formatting/limits that provide no architectural value.

## Technical Context

**Language/Version**: TypeScript 5.3 targeting Node.js 20+
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.18.2, autotask-node ^1.0.0, zod ^3.22.4, winston ^3.11.0
**Storage**: N/A (MCP server stateless except in-memory metadata cache)
**Testing**: Jest 29.7.0 with ts-jest, ≥80% overall coverage required, 100% on critical paths
**Target Platform**: Node.js server (stdio/HTTP transports)
**Project Type**: Single project (TypeScript MCP server under src/)
**Performance Goals**: Tool execution <100ms for validation errors (no API call), <2s for typical API queries
**Constraints**: MCP protocol compliance, backward compatibility for behavior (not naming), character limit 25,000 per response
**Scale/Scope**: 40+ existing tools to migrate, all under src/handlers/tool.handler.ts (1862 lines)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend-Only MCP Charter**: ✅ PASS - All work confined to src/handlers/tool.handler.ts and potentially new validation/formatting utilities under src/utils/. No frontend, alternate services, or unrelated runtimes.

- **Autotask Data Stewardship**: ✅ PASS - No new Autotask entities or API endpoints required. Refactoring only affects tool registration and parameter validation, not underlying data access patterns. Existing AutotaskService layer remains unchanged. No changes to data sensitivity handling (already handled by AutotaskService).

- **Quality Gates & Test Discipline**: ✅ PASS - Existing tests under tests/ will be updated to use new tool names. New tests required for:
  - Zod validation schemas (unit tests for each tool parameter schema)
  - Response format logic (JSON vs Markdown)
  - Character limit truncation logic
  - Tool annotation correctness
  Target: Maintain ≥80% overall coverage, 100% on tool registration and validation paths. Validation: `npm test` and `npm run test:coverage` in CI.

- **Structured Observability & Error Hygiene**: ✅ PASS - Existing winston logger usage continues. Zod validation errors will be mapped through existing ErrorMapper utility (src/utils/error-mapper.ts) to provide structured, actionable diagnostics. No new logging infrastructure required.

- **Secure Configuration & Operational Readiness**: ✅ PASS - No new environment variables required. Documentation updates needed:
  - README.md: Update tool name examples from `search_companies` to `autotask_search_companies`
  - docs/: Update Claude Desktop configuration examples
  - MIGRATION.md: Create migration guide for users upgrading from pre-compliance versions
  - No deployment changes (stdio/HTTP transports remain unchanged)

### Post-Phase 1 Re-evaluation (2025-10-17)

After completing design artifacts (research.md, data-model.md, contracts/, quickstart.md), all constitution principles remain satisfied:

- **Backend-Only MCP Charter**: ✅ CONFIRMED - Design confirms all new code stays in src/utils/{validation,formatting}/ and src/handlers/tool.handler.ts. No frontend, alternate runtimes, or scope creep detected.

- **Autotask Data Stewardship**: ✅ CONFIRMED - Data model shows no new Autotask entities, only refactoring of tool definitions. Service layer (src/services/autotask.service.ts) remains untouched. Validation happens at tool handler boundary before service calls.

- **Quality Gates & Test Discipline**: ✅ CONFIRMED - Test plan identified in quickstart.md:
  - New unit tests: validation.test.ts, formatting.test.ts
  - Updated integration tests: tool-integration.test.ts with new tool names
  - Target maintained: ≥80% overall, 100% on critical paths
  - Migration checklist includes "Run npm test && npm run test:coverage" step

- **Structured Observability & Error Hygiene**: ✅ CONFIRMED - Validation error formatting contract (validation-schemas.contract.ts) shows structured errors with code, message, details, guidance, correlationId. Winston logger integration confirmed unchanged.

- **Secure Configuration & Operational Readiness**: ✅ CONFIRMED - Design shows no new environment variables. Documentation artifacts created (quickstart.md, data-model.md). Migration guide checklist includes README.md and MIGRATION.md updates. Agent context successfully updated via update-agent-context.sh.

**Verdict (Original - 2025-10-17)**: All constitutional requirements satisfied post-design. Ready for Phase 2 (task generation) and implementation.

### Amendment: Domain Validation Architecture Compliance (2025-10-19)

**Context**: During clarification phase (2025-10-19), discovered existing `TicketUpdateValidator` that implements business logic validation beyond structural Zod validation. This revealed a critical architectural pattern that was elevated to constitution v1.1.0 as Section 6: Domain Validation Architecture.

**Constitutional Requirement**: Two-layer validation for Autotask operations:
- **Layer 1 (Zod)**: Structural type/format validation
- **Layer 2 (Business)**: Domain validators for metadata-driven rules, business constraints, content sanitization

**Compliance Check**:

- **Section 6: Domain Validation Architecture**: ✅ PASS WITH AMENDMENTS
  - **Requirement**: MUST implement two-layer validation for operations interacting with Autotask API state/metadata
  - **Assessment**: 
    - ✅ Existing `TicketUpdateValidator` and `TicketMetadataCache` (src/services/) preserved and integrated
    - ✅ Tasks T040 (Ticket tools) and T047 (Note tools) updated to implement both layers:
      1. Zod validation for type checking (new)
      2. Business validation via TicketUpdateValidator (existing, preserved)
    - ✅ All other tools use Zod-only validation (appropriate for search/read operations)
  - **Files to Preserve**:
    - `src/services/ticket-update.validator.ts`
    - `src/services/ticket-metadata.cache.ts`
    - `src/utils/error-mapper.ts` (used by both layers)
  - **Documentation Updated**:
    - `spec.md` FR-014: Two-layer validation requirement added
    - `.specify/memory/learnings/two-layer-validation.md` created
    - `specs/004-mcp-best-practices-review/analysis-custom-validation.md` created
  - **Implementation Pattern** (from learning doc):
    ```typescript
    // Layer 1: Zod structural validation
    const zodValidation = TicketSchemas.UpdateTicket.safeParse(args);
    if (!zodValidation.success) {
      return this.handleValidationError(zodValidation.error, "autotask_update_ticket");
    }
    
    // Layer 2: Business validation
    await this.autotaskService.ensureMetadataCacheInitialized();
    const validator = this.getValidator();
    const businessValidation = validator.validateTicketUpdate(zodValidation.data);
    
    if (!businessValidation.validation.isValid) {
      const mappedError = ErrorMapper.mapValidationErrors(
        businessValidation.validation.errors,
        "autotask_update_ticket"
      );
      return { content: [{ type: "text", text: JSON.stringify({ isError: true, error: mappedError }) }], isError: true };
    }
    
    // Use sanitized payload from business validator
    const { id: _ignored, ...updateFields } = businessValidation.payload;
    result = await this.autotaskService.updateTicket(ticketId, updateFields);
    ```

**Impact on Plan**:
- ✅ Project structure (lines 82-120): No changes needed - validators already exist under `src/services/`
- ✅ Phase structure: No changes - implementation phases remain valid
- ⚠️ Task updates required:
  - T040 (Integrate Zod validation for Ticket tools): Add note about preserving Layer 2 validation
  - T047 (Integrate Zod validation for Note tools): Add note about preserving Layer 2 validation
  - See `tasks.md` for updated task descriptions

**Amended Verdict**: All constitutional requirements satisfied including new Section 6 (Domain Validation Architecture). Two-layer validation pattern documented and will be implemented for affected tools (`autotask_update_ticket`, `autotask_create_ticket_note`). Ready for implementation with no plan restructuring required.

---

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── handlers/
│   ├── tool.handler.ts          # PRIMARY: All 40+ tool definitions (REFACTOR NEEDED)
│   └── resource.handler.ts      # No changes (resources out of scope)
├── services/
│   ├── autotask.service.ts      # No changes (existing API layer)
│   └── ticket-update.validator.ts # Existing validation (reference for Zod patterns)
├── utils/
│   ├── validation/               # NEW: Zod schemas for tool parameters
│   │   ├── company.schemas.ts    # Company tool parameter schemas
│   │   ├── contact.schemas.ts    # Contact tool parameter schemas
│   │   ├── ticket.schemas.ts     # Ticket tool parameter schemas
│   │   └── index.ts              # Export all schemas
│   ├── error-mapper.ts           # EXTEND: Map Zod validation errors to MCP format
│   └── logger.ts                 # No changes (existing logging)
├── types/
│   ├── mcp.ts                    # EXTEND: Add tool annotation types
│   └── autotask.ts               # No changes (existing types)
└── mcp/
    └── server.ts                 # No changes (existing MCP server)

tests/
├── unit/
│   ├── handlers/
│   │   └── tool.handler.test.ts  # UPDATE: Use new tool names
│   ├── utils/
│   │   └── validation.test.ts    # NEW: Test Zod schemas
│   └── services/
│       └── autotask.service.test.ts # UPDATE: Use new tool names
└── integration/
    └── tool-integration.test.ts  # UPDATE: Use new tool names
```

**Structure Decision**: Single project structure (Option 1). All refactoring work happens within the existing TypeScript MCP server under src/. New utilities added under src/utils/validation/ to maintain separation of concerns without introducing additional complexity. The 1862-line tool.handler.ts will remain as a single file (splitting into multiple files is explicitly out of scope per spec.md).

**Note**: No formatting utilities are needed. MCP tools return JSON to LLMs, which handle human-friendly output generation.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No constitution violations. All gates pass.
