# Story 1.6: Ticket Patch Tool

## Story
As a support automation engineer,
I want the MCP server to expose a ticket update tool,
so that AI assistants can patch existing Autotask tickets without manual console work.

## Acceptance Criteria
1. A new `autotask_update_ticket` tool is listed by the MCP server with input schema requiring `ticketId` and allowing partial updates to core ticket fields (status, priority, queue, due dates, summary, description, resolution).
2. Calling `autotask_update_ticket` invokes the existing service-layer `updateTicket` helper so that Autotask receives a PATCH request containing only the provided fields.
3. The tool validates that at least one mutable field accompanies `ticketId` and returns a descriptive error when validation fails.
4. Successful calls return a confirmation message consistent with other ticket tools; failures surface the underlying Autotask error details (status code + message) for debugging.
5. Documentation is updated with usage guidance, including live-test instructions referencing the new tool.

## Integration Verification
- **IV1**: `list_tools` response includes `autotask_update_ticket` with the expected schema and description.
- **IV2**: Autotask sandbox smoke test confirms a ticket can be patched (e.g., priority change) and response mirrors Autotask portal updates.
- **IV3**: Existing ticket tools (`autotask_search_tickets`, `autotask_create_ticket`, `autotask_get_ticket_details`) continue to behave unchanged when regression suite runs.

## Tasks / Subtasks
- [x] Extend `AutotaskToolHandler.listTools` with an `autotask_update_ticket` definition mirroring other ticket tools (AC: 1).
- [x] Implement `autotask_update_ticket` handling in `AutotaskToolHandler.callTool`, delegating to `AutotaskService.updateTicket` and enforcing validation (AC: 2, 3, 4).
- [x] Add unit tests covering happy path and validation failure (mocking Autotask service) in `tests/handlers` or extend existing ticket test coverage (AC: 4).
- [x] Update README tooling section and `docs/TESTING_INSTRUCTIONS.md` with the new tool plus live test guidance (AC: 5).
- [ ] Execute `npm test`, `AUTOTASK_ENABLE_LIVE_TESTS=true npm test -- basic-autotask-connection`, and document optional Smithery smoke steps for the new tool.

## Dev Notes
### Previous Story Insights
- Most recent story added smoke scripts and env flags for hosted/lived tests; no additional guidance located in architecture documents.

### Data Models
- Project operates purely as a backend MCP server integrating with the Autotask REST API—ticket payloads flow through the existing TypeScript service layer without local persistence. [Source: architecture/tech-stack.md#runtime-environment]

### API Specifications
- Autotask interactions are brokered by `autotask-node`; new tooling should reuse the current service façade rather than calling the client directly to stay aligned with existing patterns. [Source: architecture/source-tree.md#key-source-modules-src]

### Component Specifications
- No UI/front-end components exist in this project; tooling surfaces via MCP resources only. [Source: architecture/tech-stack.md#explicit-non-inclusions]

### File Locations
- Tool definitions live in `src/handlers/tool.handler.ts`; Autotask service helpers reside in `src/services/autotask.service.ts`, and tests for handlers belong under `tests/`. [Source: architecture/source-tree.md#key-source-modules-src]

### Testing Requirements
- Use Jest with ts-jest configuration, keep coverage within `tests/` and follow existing patterns for mocking external clients. [Source: architecture/coding-standards.md#testing--quality]
- Reference `docs/TESTING_INSTRUCTIONS.md` to document any new smoke test steps required for the live Autotask check.

### Technical Constraints
- Code must remain strict TypeScript (ES2020 output) and follow existing logging/error handling conventions enforced by the coding standards. [Source: architecture/coding-standards.md#typescript--project-layout]

## Testing
- [x] Unit tests for `autotask_update_ticket` handler path (mocking Autotask service success/failure).
- [x] Validation unit test ensuring payload without mutable fields is rejected.
- [ ] Optional integration smoke: live Autotask patch using sandbox credentials (documented in testing instructions).
- [x] Regression suite (`npm test`) passes.

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-09-17 | v1.0 | Initial draft for ticket patch tool story | Bob (SM) |
| 2025-09-17 | v1.1 | PO validation; ready for development handoff | Sarah (PO) |
| 2025-09-17 | v2.0 | Implemented update tool, docs, unit tests, and smoke script | James (Dev) |

## Status
Ready for Review

## Dev Agent Record

### Agent Model Used
OpenAI GPT-5 Codex (2025-09)

### Debug Log References
- 2025-09-17 `npm test` (all suites pass; live Autotask smoke skipped without credentials)

### Completion Notes List
- Added `autotask_update_ticket` tool definition/handler with field validation and service delegation.
- Created focused Jest coverage verifying success and validation failure paths.
- Documented ticket patch smoke flow and regression commands, plus added `scripts/test-ticket-update.js` helper.
- Updated README tooling table to surface new capability.
- Live Autotask connection test remains gated pending credentials; smoke script ready once available.

### File List
- src/handlers/tool.handler.ts
- tests/tool-handler.test.ts
- README.md
- docs/TESTING_INSTRUCTIONS.md
- scripts/test-ticket-update.js
- docs/stories/story-1.6-ticket-update-tool.md

## QA Results

### Review Date: 2025-09-17

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

- Implementation follows coding standards (strict TS, logging via Logger)
- Handler validation prevents empty mutations and filters fields to a whitelist
- Unit tests cover listing, validation failure, and success delegation paths

### Compliance Check

- Coding Standards: ✓
- Project Structure: ✓
- Testing Strategy: ✓
- All ACs Met: ✓

### Files Modified During Review

- docs/qa/assessments/1.6-test-design-2025-09-17.md
- docs/qa/assessments/1.6-trace-2025-09-17.md
- docs/qa/assessments/1.6-risk-2025-09-17.md
- docs/qa/assessments/1.6-nfr-2025-09-17.md
- docs/qa/gates/1.6-ticket-patch-tool.yml

### Gate Status

Gate: PASS → docs/qa/gates/1.6-ticket-patch-tool.yml
Risk profile: docs/qa/assessments/1.6-risk-2025-09-17.md
NFR assessment: docs/qa/assessments/1.6-nfr-2025-09-17.md

### Recommended Status

[✓ Ready for Done]
