# Quickstart — Ticket Update Reliability

This guide helps operators and QA reviewers validate the Ticket Update Reliability feature end-to-end.

## Prerequisites
- Autotask sandbox credentials with permission to update tickets, create notes, and view resources.
- Node.js 18+ with project dependencies installed (`npm install`).
- MCP client (e.g., Claude Desktop) configured to point at the local `autotask-mcp` server.

## 1. Start the MCP Server
```bash
npm run build
AUTOTASK_USERNAME=... AUTOTASK_SECRET=... AUTOTASK_INTEGRATION_CODE=... npm start
```
Ensure the server logs show successful metadata cache loading for statuses, priorities, and resources.

## 2. Verify Ticket Assignment Update
1. Identify a test ticket ID and two active resource IDs.
2. Invoke the `update_ticket` tool from your MCP client with:
   ```json
   {
     "ticketId": 12345,
     "assignedResourceID": 678,
     "status": 2,
     "priority": 4
   }
   ```
3. Confirm the command returns a success payload.
4. In Autotask UI, verify the ticket shows the new resource, status, and priority.

## 3. Validate Note Creation
1. Call the assistant to add an internal note:
   ```json
   {
     "ticketId": 12345,
     "title": "Internal triage",
     "description": "Investigating network outage.",
     "publish": 1
   }
   ```
2. Repeat with an external note (`"publish": 3`).
3. Confirm Autotask shows the internal note as staff-only and the external note as customer-visible.

## 4. Error Handling Checks
- Attempt to set an invalid status code (e.g., 999) and confirm the assistant returns an actionable error referencing allowed codes.
- Temporarily revoke permission or use an inactive resource ID to confirm error messaging identifies the specific issue.

## 5. Run Automated Tests
```bash
npm run lint
npm test -- TicketUpdate
```
Expect ≥80% overall coverage with 100% on ticket update modules; review coverage report for regressions.

## 6. Review Logs
- Inspect `logs/` or console output for structured entries containing `ticketId`, `operation`, `result`, and sanitized details.
- Ensure no credential fields appear in log entries.

## Sign-off Criteria
- All automated tests pass.
- Manual assignment, status, priority, and note updates succeed.
- Error scenarios provide clear operator guidance.
- Logs meet observability requirements without leaking sensitive data.
