# Feature Specification: MCP Best Practices Compliance

**Feature Branch**: `004-mcp-best-practices-review`
**Created**: 2025-10-17
**Status**: Draft
**Input**: User description: "examine my server for best practices"

## Constitution Alignment

- **Backend scope**: All work is within the existing TypeScript MCP server codebase (src/handlers/, src/services/, src/types/). No frontend or unrelated services involved.
- **Autotask touchpoints**: No new Autotask API endpoints required. Changes impact how existing tools are registered and documented, not the underlying service layer.
- **Quality gates**: All changes must maintain ≥80% overall coverage and 100% coverage on critical paths (tool registration, validation). Linting must pass (ESLint strict mode).
- **Observability**: No new logging/telemetry required. Existing logger usage remains unchanged.
- **Configuration**: No new environment variables required. Documentation updates needed for tool naming changes (README.md, Claude Desktop integration guide).

## Clarifications

### Session 2025-10-19

- Q: How should the system handle tools that require both static type validation (Zod) and dynamic business validation (e.g., validating status IDs against Autotask metadata cache)? → A: Preserve two-layer validation pattern and document it as a best practice in spec (Zod for types, business validators for domain rules)
- Q: What is the rationale for the 25,000 character response limit - is it tied to LLM context windows or a different constraint? → A: MCP protocol tool response limit
- Q: Should JSON Schema generation from Zod schemas happen at build time (pre-generated) or runtime (dynamic conversion)? → A: Generate JSON schemas dynamically at runtime using zodToJsonSchema when tools are listed (standard MCP pattern)
- Q: What level of detail should Markdown responses include for entities (all fields vs. summary vs. minimal)? → A: Balanced summary (key fields only) - ID, name, status, dates, primary relationships; full data via JSON
- Q: Should validation errors use MCP protocol-level errors or success responses with error content (isError flag)? → A: Hybrid: Type errors throw exceptions (MCP protocol errors with ErrorCode.InvalidParams), business validation returns error content (isError: true)

## User Scenarios & Testing

### User Story 1 - Multi-Server Tool Discovery (Priority: P1)

Users need to connect multiple MCP servers (Autotask, GitHub, Jira, Slack) to Claude Desktop and have tools from all servers work without naming conflicts. Currently, Autotask tools like `search_companies` could conflict with similar tools from other PSA/CRM servers.

**Why this priority**: Tool name conflicts break the core value proposition of MCP - composing multiple servers. Without unique tool names, users cannot use Autotask MCP alongside other business tool servers.

**Independent Test**: Can be fully tested by configuring two MCP servers with overlapping tool names in Claude Desktop. Success means both servers' tools are accessible with no ambiguity.

**Acceptance Scenarios**:

1. **Given** Claude Desktop has Autotask MCP and another PSA server configured, **When** user asks "search for companies matching XYZ", **Then** Claude can unambiguously route to the correct server's search tool based on the `autotask_` prefix
2. **Given** 5 MCP servers are configured with various tool names, **When** tools list is displayed, **Then** all Autotask tools are clearly identifiable by their `autotask_` prefix
3. **Given** a tool name collision exists between two servers, **When** MCP client attempts to call a tool, **Then** the client can disambiguate using the service prefix

---

### User Story 2 - LLM Understanding of Tool Behavior (Priority: P2)

AI assistants need to understand which tools are safe to call automatically versus which require user confirmation. Tool annotations (readOnlyHint, destructiveHint) guide the LLM's decision-making about when to request permission.

**Why this priority**: Without annotations, LLMs may incorrectly assume all tools are safe to auto-execute, or conversely, request permission for harmless read operations, degrading UX.

**Independent Test**: Can be tested by observing Claude's behavior when calling annotated vs. non-annotated tools. Read-only tools should execute with minimal friction, while destructive tools should prompt for confirmation.

**Acceptance Scenarios**:

1. **Given** a search tool with `readOnlyHint: true`, **When** Claude needs company data, **Then** Claude executes the search without requesting explicit permission (low-friction UX)
2. **Given** an update tool with `destructiveHint: true`, **When** Claude plans to modify a ticket, **Then** Claude presents the plan and requests user approval before execution
3. **Given** a create tool with `idempotentHint: false`, **When** Claude receives an error, **Then** Claude does not automatically retry (avoiding duplicate entities)

---

### User Story 4 - Input Validation with Clear Feedback (Priority: P2)

Users and AI assistants receive immediate, actionable feedback when providing invalid parameters to tools, preventing wasted API calls and improving developer experience.

**Why this priority**: Critical for reliability and UX. Without runtime validation, invalid inputs propagate to Autotask API, resulting in cryptic errors.

**Independent Test**: Can be tested by calling tools with invalid parameters (e.g., negative pageSize, invalid email format) and verifying clear error messages with guidance.

**Acceptance Scenarios**:

1. **Given** user calls `autotask_create_contact` with invalid email format, **When** Zod validation runs, **Then** MCP protocol error (`McpError` with `ErrorCode.InvalidParams`) thrown stating "Invalid email format" with example of valid format
2. **Given** AI calls `autotask_search_companies` with `pageSize: 1000`, **When** Zod validation runs, **Then** MCP protocol error thrown stating "pageSize must be between -1 and 500"
3. **Given** user calls `autotask_update_ticket` with invalid status ID, **When** business validation runs, **Then** success response returned with `isError: true` and error content listing valid status IDs for the user's Autotask instance

---

### Edge Cases

- **What happens when a tool name conflicts with an MCP built-in?** Tool names use `autotask_` prefix to avoid conflicts with any future MCP protocol built-ins or other servers.
- **How does system handle tools with varying annotation requirements?** Each tool is independently annotated based on its specific behavior (read-only, destructive, idempotent).
- **What if Zod validation schema doesn't match TypeScript type?** Use `z.infer<typeof Schema>` to ensure TypeScript types are derived from Zod schemas, keeping them in sync.
- **What happens if a tool has no clear destructive/idempotent classification?** Default to conservative annotations (assume destructive, assume not idempotent) to err on the side of caution.
- **When should a tool use two-layer validation vs Zod-only?** Use two-layer validation only for tools that validate against dynamic external data (Autotask metadata cache), enforce API-specific constraints beyond type checking, or require content sanitization. Most tools (search, create without complex rules) use Zod-only validation.
- **How are validation errors distinguished between type errors and business logic errors?** Zod type/structure validation failures throw `McpError` with `ErrorCode.InvalidParams` (MCP protocol-level errors); business validation failures return `{ isError: true, content: [...] }` (success response with error flag). This aligns with MCP SDK patterns where protocol errors indicate malformed requests, while isError responses indicate application-level failures.

## Requirements

### Functional Requirements

- **FR-001**: All tool names MUST include the `autotask_` service prefix (e.g., `autotask_search_companies`, `autotask_create_ticket`)
- **FR-002**: All tools MUST include MCP tool annotations with appropriate values for `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`
- **FR-003**: System MUST format JSON responses with complete structured data including all available fields (default MCP behavior)
- **FR-004**: All tool parameters MUST use Zod schemas for runtime validation with `.strict()` mode enabled
- **FR-005**: Zod validation errors MUST throw MCP protocol errors (`McpError` with `ErrorCode.InvalidParams`) providing clear, actionable messages indicating which parameter failed and why; business validation errors MUST return success responses with `isError: true` flag and structured error content
- **FR-006**: TypeScript types for tool parameters MUST be inferred from Zod schemas using `z.infer<typeof Schema>`
- **FR-007**: All 40+ existing tools MUST be migrated to the new naming and validation patterns
- **FR-008**: README.md and Claude Desktop integration documentation MUST be updated with new tool names
- **FR-009**: Tools requiring domain-specific validation (e.g., `autotask_update_ticket`, `autotask_create_ticket_note`) MUST implement two-layer validation: Layer 1 (Zod for type safety) followed by Layer 2 (business validators for dynamic rules like metadata cache validation, content sanitization, and Autotask API constraints)

### Key Entities

This feature does not introduce new data entities. It refactors how existing Autotask entities (Companies, Contacts, Tickets, etc.) are accessed through MCP tools.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 40+ tools have the `autotask_` prefix and can coexist with tools from other MCP servers without naming conflicts
- **SC-002**: 100% of tools include complete MCP annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
- **SC-003**: 100% of tool parameters use Zod schemas with comprehensive validation constraints
- **SC-004**: Invalid tool calls return clear error messages within 100ms (no API roundtrip for validation errors); Zod type validation failures throw `McpError(ErrorCode.InvalidParams)`, business validation failures return `{ isError: true, content: [...] }`
- **SC-005**: TypeScript compilation succeeds with zero type errors after Zod schema migration
- **SC-006**: All existing tool functionality remains unchanged (backward compatibility for behavior, not naming)
- **SC-007**: Test coverage remains ≥80% overall and 100% on critical paths (tool registration, validation)
- **SC-008**: Documentation accurately reflects all new tool names and includes migration guidance for existing users

## Assumptions

- **Assumption 1**: Existing users can adapt to tool name changes with clear migration documentation (breaking change is acceptable for MCP protocol compliance)
- **Assumption 2**: Tool annotations are hints only and do not enforce security constraints (security remains in service layer)
- **Assumption 3**: Zod schemas can validate all existing tool parameters without requiring API changes
- **Assumption 4**: Business validators (TicketUpdateValidator, TicketMetadataCache) are preserved for tools requiring validation against dynamic Autotask data; two-layer validation (Zod + business) applies only where needed, not universally
- **Assumption 5**: Runtime Zod to JSON Schema conversion using zodToJsonSchema has negligible performance impact (<1ms per schema) and aligns with standard MCP TypeScript SDK patterns

## Dependencies

- **Dependency 1**: Zod library (already present in package.json)
- **Dependency 2**: zod-to-json-schema library for runtime Zod to JSON Schema conversion (add to package.json)
- **Dependency 3**: MCP TypeScript SDK (already present, version ^1.18.2) - includes `McpError` and `ErrorCode` exports for protocol-level error handling
- **Dependency 4**: Existing AutotaskService and tool handler infrastructure
- **Dependency 5**: No new Autotask API permissions or endpoints required
- **Dependency 6**: Existing TicketUpdateValidator and TicketMetadataCache (src/services/ticket-update.validator.ts, src/services/ticket-metadata.cache.ts) preserved for business validation layer

## Out of Scope

- **Code composability refactoring**: Splitting tool.handler.ts into smaller files is explicitly out of scope (quality improvement, not compliance)
- **Server name change**: Renaming from `autotask-mcp` to `autotask-mcp-server` is out of scope (minor convention, not blocking)
- **Resources API changes**: This feature focuses on tools; resource templates remain unchanged
- **Transport layer modifications**: stdio/HTTP transport implementation remains unchanged
- **Enhanced tool descriptions**: Adding comprehensive Args/Returns/Examples sections is deprioritized (quality improvement)
- **Backward compatible naming**: No attempt to support both old and new tool names; clean break for MCP compliance

### Explicitly Out of Scope (Architectural)

The following capabilities were considered but are explicitly excluded based on MCP architectural reality:

- **Markdown response formatting**: Tool responses are consumed by LLMs, not displayed to users. The MCP flow is: Tool → JSON → LLM processes → LLM generates human-friendly output. There is no UI layer that displays raw tool responses to end users. LLMs excel at consuming structured JSON and transforming it into natural language.

- **Global character limits with truncation**: Response size management is already handled via the `pageSize` parameter on search tools. The MCP protocol enforces message size limits automatically at the transport layer. Implementing global truncation would add complexity without addressing actual architectural constraints, as LLMs handle large JSON structures efficiently through their context management.

Both features were originally marked as Priority P3 (lowest priority) in the initial specification, signaling they were "not blocking" for core functionality. Architectural discovery confirmed they provide no value in the actual MCP deployment model.
