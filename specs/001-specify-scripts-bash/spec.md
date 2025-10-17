# Feature Specification: Ticket Update Reliability

**Feature Branch**: `[001-specify-scripts-bash]`  
**Created**: 2025-10-16  
**Status**: Draft  
**Input**: User description: "To enable us to do updates right now, fetching seems to be working, but updates is having problems. I want to be able to:
- Assign another resource
- Change the status
- Add internal and external notes
- Change priorities
Currently, we're getting errors such as this: { ... }"

## Constitution Alignment (fill before drafting stories)

- Backend scope: Enhancements remain inside the existing backend-only MCP server, extending ticket update handlers without introducing new services or UI layers.
- Autotask touchpoints: Work targets Autotask Tickets, Ticket Assignments, and Ticket Notes endpoints via authenticated API calls permitted for update operations; requires write access for ticket fields and notes.
- Quality gates: Maintain ≥80% overall test coverage and 100% coverage for ticket update pathways; add regression tests validating assignment, status, priority, and note updates, executed through `npm run lint` and `npm test`.
- Observability: Expand structured logging around ticket update attempts (inputs, Autotask responses, retries) while redacting sensitive payload values; surface actionable errors to clients.
- Configuration: No new environment variables anticipated; document any Autotask permission prerequisites or Smithery deployment notes if discovered.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dispatch updates core ticket fields (Priority: P1)

Dispatch coordinators need to reassign tickets, adjust status, and reset priority from their MCP-connected assistant without switching tools.

**Why this priority**: Field updates unblock technicians and ensure the service board reflects current ownership and urgency.

**Independent Test**: Trigger `update_ticket` with new assignment, status, and priority on a test ticket and verify Autotask reflects each change with no manual intervention.

**Acceptance Scenarios**:

1. **Given** an open ticket assigned to Resource A, **When** the assistant requests assignment to Resource B and status to "In Progress", **Then** Autotask shows Resource B and the status change timestamps without HTTP errors.
2. **Given** a ticket with priority "Low", **When** the assistant sets priority to "High", **Then** the updated priority is visible in Autotask and downstream SLA timers adjust accordingly.

---

### User Story 2 - Technicians add contextual notes (Priority: P1)

Technicians must post both internal troubleshooting notes and externally visible updates from the assistant so stakeholders stay informed.

**Why this priority**: Accurate note history supports auditability and keeps customers updated without logging into Autotask directly.

**Independent Test**: Use the assistant to add one internal and one public note to a ticket, confirm visibility settings in Autotask, and ensure no validation error is returned.

**Acceptance Scenarios**:

1. **Given** a ticket needing an internal handoff note, **When** the assistant posts the note as "Internal", **Then** the note appears for staff only and is timestamped with the submitting resource.
2. **Given** a ticket awaiting a customer-facing update, **When** the assistant submits a note flagged for external publication, **Then** the note is visible to customer portals and marked as such in Autotask.

---

### User Story 3 - Operators receive actionable errors (Priority: P2)

Service desk operators need clear assistant feedback when Autotask rejects an update so they can correct inputs immediately.

**Why this priority**: Prompt diagnosis prevents repeated failed updates and reduces reliance on engineering support for routine issues.

**Independent Test**: Attempt an update with an invalid status ID and verify the assistant relays a human-readable message including the Autotask refusal reason and recommended correction.

**Acceptance Scenarios**:

1. **Given** a ticket update request containing an unauthorized status value, **When** the assistant submits the change, **Then** the response explains the status is invalid and lists the accepted range.
2. **Given** an update attempt during an Autotask outage, **When** the API returns an HTTP 500, **Then** the assistant surfaces the failure with retry guidance and no partial updates are recorded.

---

### Edge Cases

- Autotask returns HTTP 405/409 because the ticket is locked or an unsupported HTTP verb is used.
- Ticket assignment targets an inactive or non-existent resource ID.
- Notes exceed Autotask length limits or contain characters rejected by the API.
- Concurrent updates from multiple assistants cause stale data conflicts.
- User lacks permission to change status or priority, triggering authorization failures.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST update ticket assignment to any valid active resource when requested through the assistant.
- **FR-002**: System MUST allow setting ticket status to any Autotask-allowed status code and return a descriptive error when a disallowed value is provided.
- **FR-003**: System MUST adjust ticket priority to the requested level and confirm the resulting value back to the caller.
- **FR-004**: System MUST create ticket notes with explicit visibility controls, supporting both internal-only and customer-visible publication.
- **FR-005**: System MUST return structured error payloads (code, message, corrective guidance) whenever Autotask rejects or fails an update, without masking the failure.
- **FR-006**: System MUST log each ticket update attempt with sanitized payload metadata and the Autotask response for auditability.
- **FR-007**: System MUST validate inputs (resource ID, status ID, priority ID, note length) before submission and prevent calls that would violate Autotask contract rules.

### Key Entities *(include if feature involves data)*

- **Ticket**: Service request record containing assignment, status, priority, SLA metrics, and history.
- **TicketAssignment**: Association between a ticket and an active Autotask resource responsible for work.
- **TicketNote**: Comment entity with content, visibility flag (internal/external), author, and timestamp metadata.

## Assumptions

- Existing Autotask API credentials already provide write permissions for ticket updates and note creation.
- Valid status, priority, and resource lookup values can be retrieved via existing search endpoints or cached metadata.
- Client applications invoking the assistant can supply the ticket ID and desired field values without additional discovery logic in this feature.

## Dependencies

- Autotask REST API availability and adherence to documented ticket update endpoints.
- Current MCP transport and authentication flows remain unchanged; assistants will use existing `update_ticket` and note creation tools once fixed.
- Logging and error-handling utilities defined in the MCP server continue to be available for structured telemetry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of ticket update attempts (assignment, status, priority) succeed without manual retries during a monitored 7-day period.
- **SC-002**: Internal and external notes added via the assistant appear in Autotask with the correct visibility within 5 seconds of submission.
- **SC-003**: Error responses for invalid updates include actionable guidance in 100% of failure cases observed during QA.
- **SC-004**: Service desk reports a 50% reduction in manual Autotask console usage for reassignment and note updates within one month of release.
