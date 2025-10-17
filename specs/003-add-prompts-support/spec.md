# Feature Specification: Autotask MCP Prompt Catalog

**Feature Branch**: `003-add-prompts-support`  
**Created**: October 17, 2025  
**Status**: Draft  
**Input**: User description: "Implement prompts/list and prompts/get support in the Smithery Autotask MCP server so prompts load correctly in Codex and support built-in prompt metadata"

## Constitution Alignment (fill before drafting stories)

- Backend scope: Work stays within the existing Node.js/TypeScript Autotask MCP server; no changes to Autotask SaaS, third-party services, or client applications.  
- Autotask touchpoints: Prompts may surface context from Tickets, Companies, Contacts, and Time Entries by reusing already authorised Autotask API calls; no new API scopes or credentials are required.  
- Quality gates: Maintain ≥80% overall automated test coverage with targeted unit tests for prompt catalog loaders and integration coverage for happy/error paths on `prompts/list` and `prompts/get`; all linting and contract tests must remain green before merge.  
- Observability: Extend structured logging to capture prompt listing/retrieval attempts (prompt id, outcome, duration) without leaking sensitive content so operators can troubleshoot adoption issues.  
- Configuration: Document the curated prompt catalog in the repository (`docs/prompts.md`) and extend server configuration (e.g., `smithery.yaml`) to declare prompt definitions, activation flags, and version notes; changes take effect on server restart and must be mentioned in release notes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Prompt Catalog (Priority: P1)

As a service desk agent using a prompt-aware MCP client connected to the Autotask MCP server, I can browse a curated catalog of Autotask prompts so I can quickly find guidance for frequent workflows.

**Why this priority**: Without a visible catalog, agents cannot discover the prompts and the feature delivers no value.

**Independent Test**: Connect Smithery or Continue to the server and request `prompts/list`; verify that every curated prompt appears with human-readable summaries and argument guidance.

**Acceptance Scenarios**:

1. **Given** the Autotask MCP server is running with prompts enabled, **When** a prompt-capable client requests `prompts/list`, **Then** the response includes at least three prompts with ids, titles, descriptions, categories, and required argument metadata.  
2. **Given** a prompt is marked inactive in configuration, **When** the client refreshes the prompt list, **Then** the inactive prompt is omitted from the response without causing an error.

---

### User Story 2 - Draft Ticket Update Prompt (Priority: P2)

As a service desk agent working a specific ticket, I can request the “Draft ticket update” prompt with the ticket number so I receive structured guidance for my next customer response.

**Why this priority**: Structured prompts reduce response time and keep customer communications consistent.

**Independent Test**: Call `prompts/get` for the ticket update prompt with a valid Autotask ticket id and inspect the returned instructions for ticket context placeholders and reply structure guidance.

**Acceptance Scenarios**:

1. **Given** the agent supplies a valid ticket id argument, **When** `prompts/get` is invoked for the ticket update prompt, **Then** the response includes instructions that reference the ticket context and outline the customer-ready response format.  
2. **Given** the agent omits the required ticket id, **When** `prompts/get` is called, **Then** the server returns an error explaining which argument is missing and how to provide it.

---

### User Story 3 - Receive Prompt Catalog Updates (Priority: P3)

As the Autotask MCP maintainer, I can revise the prompt catalog configuration and ensure connected clients are notified so new prompts appear without manual troubleshooting.

**Why this priority**: Timely updates keep prompts aligned with evolving support policies while avoiding stale content.

**Independent Test**: Modify the prompt catalog configuration, restart the server, and observe that clients receive a list-changed notification and the updated prompt list.

**Acceptance Scenarios**:

1. **Given** a new prompt definition is added and the server restarts, **When** a client connects, **Then** it receives a `prompts/list_changed` notification and the subsequent list call returns the new prompt.  
2. **Given** a prompt definition fails validation, **When** the server loads the catalog, **Then** it logs a descriptive error, skips the invalid prompt, and continues serving the remaining catalog.

---

### Edge Cases

- Client requests a prompt id that is not defined: respond with a structured MCP error and keep the server available.  
- Autotask APIs are unreachable while building contextual data for a prompt: return a graceful fallback message instructing the agent to proceed manually and log the failure.  
- Prompt catalog configuration is missing or malformed at startup: surface a clear startup error, default to an empty catalog, and guide the operator to repair the configuration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Autotask MCP server MUST advertise the `prompts` capability with `listChanged: true` during initialization.  
- **FR-002**: The server MUST load prompt definitions from a dedicated configuration source at startup, validate required fields (id, title, description, instructions), and ignore only the invalid entries.  
- **FR-003**: The server MUST answer `prompts/list` with every active prompt, including id, title, description, use-case summary, categories/tags, and argument metadata (name, description, required flag, defaults).  
- **FR-004**: The server MUST answer `prompts/get` with the prompt instructions, guidance on how to use them, and any contextual Autotask data needed to execute the prompt when valid arguments are provided.  
- **FR-005**: When required arguments are missing or invalid, the server MUST return a structured MCP error that identifies the problematic fields without leaking sensitive data.  
- **FR-006**: The server MUST emit `notifications/prompts/list_changed` whenever the prompt catalog changes (startup, reload command, or admin trigger) so connected clients refresh automatically.  
- **FR-007**: The project MUST document the prompt catalog—including intent, audience, required inputs, and data usage notes—in repository docs and release notes for support stakeholders.

### Key Entities *(include if feature involves data)*

- **PromptDefinition**: Represents a single catalog entry (id, title, description, instructions template, categories, activation flag, default arguments, data source hints).  
- **PromptArgument**: Describes a required or optional prompt input (name, label, description, required flag, allowed values, default).  
- **PromptDataContext**: Holds optional Autotask-derived context (ticket summary, company profile, recent time entries) that accompanies prompt instructions for richer guidance.

### Assumptions

- Autotask credentials and current tool/resource capabilities remain unchanged and available when prompts request supplementary data.  
- Prompt-aware MCP clients (Smithery, Continue, Claude Code) already implement `prompts/list`, `prompts/get`, and list-changed notifications.  
- Initial release will ship with three curated prompts (ticket summary, ticket update, daily digest); future prompts can follow the same configuration pattern without code changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In user acceptance testing, 100% of prompt-capable clients display the prompt catalog within 2 seconds of connecting to the Autotask MCP server.  
- **SC-002**: During the pilot week, service desk agents report at least a 30% reduction in time-to-draft for customer updates when using the prompts compared to their previous baseline.  
- **SC-003**: No critical or high-severity errors are logged across 50 consecutive `prompts/get` requests with valid arguments in staging.  
- **SC-004**: At least 90% of surveyed pilot agents rate the curated prompts as “helpful” or better within two weeks of launch.

