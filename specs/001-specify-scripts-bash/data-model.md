# Data Model — Ticket Update Reliability

**Feature**: Ticket Update Reliability  
**Last Updated**: 2025-10-16

---

## Entities

### Ticket
| Field | Type | Description | Validation / Notes |
|-------|------|-------------|--------------------|
| `id` | number | Autotask ticket identifier | Required; immutable |
| `title` | string | Current summary | Optional for updates; echoed in confirmations |
| `statusId` | number | Autotask status code | Must exist in cached status map; transitions must follow tenant rules |
| `priorityId` | number | Autotask priority code | Must exist in cached priority map |
| `assignedResourceId` | number \| null | Active resource responsible | Must reference active resource; null permitted for unassigned tickets |
| `queueId` | number | Routing queue | Optional but validated when present |
| `lastActivityDate` | ISO datetime | Autotask managed timestamp | Read-only |

**Relationships**:  
- One `Ticket` can have zero or many `TicketNote` records.
- One `Ticket` can be assigned to zero or one `TicketAssignment`.

**State Transitions**:  
- Status transitions constrained to Autotask tenant configuration; plan enforces allowed `statusId` values via cached metadata.
- Priority changes unrestricted except to allowed codes.

### TicketAssignment
| Field | Type | Description | Validation / Notes |
|-------|------|-------------|--------------------|
| `ticketId` | number | Ticket being assigned | Required |
| `resourceId` | number | Resource receiving assignment | Must be active and have ticket permissions |
| `roleId` | number | Optional role classification | Optional, pass-through |
| `effectiveDate` | ISO datetime | When assignment takes effect | Defaults to current time |

**Relationships**:  
- `TicketAssignment.ticketId` references `Ticket.id`.
- `TicketAssignment.resourceId` references Autotask `Resource` entity (external).

### TicketNote
| Field | Type | Description | Validation / Notes |
|-------|------|-------------|--------------------|
| `id` | number | Autotask note identifier | Assigned by Autotask |
| `ticketId` | number | Parent ticket | Required on creation |
| `title` | string | Optional subject line | Optional; trimmed to Autotask max length |
| `description` | string | Note body | Required; enforce length limit (32k chars) |
| `publish` | number | Visibility flag (1=Internal, 3=Customer-facing) | Required; enforce allowed set {1,3} for this feature |
| `createdByResourceId` | number | Authoring resource | Derived from assistant credentials |
| `createdDate` | ISO datetime | Autotask managed timestamp | Read-only |

**Relationships**:  
- `TicketNote.ticketId` references `Ticket.id`.

---

## Validation Rules
- **Resource Validation**: `assignedResourceId` must belong to cached list of active resources; fail fast before calling Autotask when invalid.
- **Status Validation**: `statusId` must exist in cached status metadata and respect blocked transitions; surface explicit error when invalid.
- **Priority Validation**: `priorityId` must exist in cached priority metadata; enforce mapping by tenant.
- **Note Visibility**: `publish` limited to internal (1) or external (3) modes required by feature scope; other publish levels rejected with error guidance.
- **Note Length**: Reject note bodies exceeding Autotask maximum (32,000 chars) with actionable messaging.
- **Concurrency**: Include `LastActivityDate` (or equivalent sync token) in PATCH payload when available to prevent overwriting newer changes; if conflict detected, surface guidance to retry with refreshed data.

---

## Derived Data & Caching
- **Metadata Cache**: Maintain in-memory cache for statuses, priorities, and resources; refresh on startup and every 15 minutes to stay current.
- **Audit Logs**: Record sanitized change summary (ticketId, fields updated, publish level) in `winston` logs for traceability.

---

## Open Questions
- None; all clarifications resolved during research.
