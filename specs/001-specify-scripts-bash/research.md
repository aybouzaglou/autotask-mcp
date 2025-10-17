# Research Log — Ticket Update Reliability

**Date**: 2025-10-16  
**Participants**: Codex (analysis)  
**Sources Consulted**: Autotask REST API documentation (Tickets, Notes endpoints), existing MCP server implementation (`src/services/autotask.service.ts`, `src/handlers/ticket.handler.ts`), prior update failure logs provided in feature request.

---

## Ticket Update Transport
- **Decision**: Use Autotask REST `PATCH /Tickets/{id}` requests via the existing `autotask-node` client to modify assignment, status, and priority fields in a single call when possible.
- **Rationale**: Autotask REST supports PATCH semantics for ticket fields, minimizing round-trips and matching the current tool contract (`update_ticket`). Consolidating updates reduces race conditions and keeps behaviour aligned with 405 error expectations (likely from incorrect HTTP verb).
- **Alternatives Considered**:
  - **Multiple PATCH calls per field**: Rejected to avoid partial update inconsistencies and extra latency.
  - **SOAP Autotask API**: Rejected because project already standardised on REST client via `autotask-node`.

## Assignment Validation
- **Decision**: Pre-validate requested resource IDs by querying `search_resources` (cached) and ensuring the resource is active before submitting the ticket PATCH.
- **Rationale**: Avoids Autotask 400/405 responses caused by invalid or inactive resources and delivers faster feedback to assistants.
- **Alternatives Considered**:
  - **Rely on PATCH response errors only**: Rejected; provides poorer UX and complicates actionable error messaging.
  - **Maintain a static resource allowlist**: Rejected due to frequent staffing changes.

## Status & Priority Enforcement
- **Decision**: Maintain a local map of allowed status and priority codes fetched from Autotask configuration endpoints during server startup (or cached refresh) and validate user requests against it before PATCH.
- **Rationale**: Guarantees assistants cannot request disallowed transitions and supports detailed error messages when they do.
- **Alternatives Considered**:
  - **Hard-code commonly used codes**: Rejected; different tenants customise statuses, making hardcoding brittle.
  - **Dynamically query on every request**: Rejected for latency reasons; caching with periodic refresh is sufficient.

## Note Publication
- **Decision**: Continue using the `create_ticket_note` helper with explicit `publish` flags to differentiate internal (1) versus external (3) notes, ensuring titles optional but descriptions mandatory.
- **Rationale**: Aligns with Autotask note model, satisfies requirement for visibility control, and leverages existing tool interface.
- **Alternatives Considered**:
  - **Embed notes inside ticket PATCH `Resolution`**: Rejected because it conflates resolution updates with note history.
  - **Custom note storage**: Rejected; violates Autotask data stewardship.

## Error Surface & Logging
- **Decision**: Wrap all Autotask client errors into structured responses `{ code, message, guidance }`, logging correlation IDs and request metadata (without payload secrets) using `winston`.
- **Rationale**: Meets constitution requirements for observability and provides actionable errors to operators per User Story 3.
- **Alternatives Considered**:
  - **Pass-through raw Autotask errors**: Rejected; raw errors are inconsistent and sometimes omit guidance.
  - **Hide detailed errors**: Rejected; fails success criteria requiring actionable guidance.

## Retry & Idempotency
- **Decision**: Implement a single retry with exponential backoff for transient 5xx responses while ensuring idempotency via Autotask request IDs; surface failure if both attempts fail.
- **Rationale**: Stabilises behaviour during temporary outages without masking persistent issues.
- **Alternatives Considered**:
  - **No retries**: Risks failing success criteria for transient outages.
  - **Unlimited retries**: Could cause cascading Autotask load and duplicate updates.

---

All outstanding clarifications resolved within this research log; no `NEEDS CLARIFICATION` markers remain in the plan.
