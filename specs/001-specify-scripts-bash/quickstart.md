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

## 7. Troubleshooting Guide

### Common Error Codes and Resolution Steps

#### INACTIVE_RESOURCE
**Error**: "Cannot assign inactive resource to ticket"
**Cause**: Attempting to assign a resource that is marked as inactive in Autotask
**Resolution**:
1. Use `search_resources` tool to list active resources
2. Verify the resource ID is active before assignment
3. Contact Autotask administrator to reactivate the resource if needed

#### INVALID_STATUS
**Error**: "Invalid ticket status"
**Cause**: Status transition not allowed by Autotask workflow rules
**Resolution**:
1. Check current ticket status using `get_ticket_details`
2. Review allowed status transitions for your Autotask configuration
3. Use a valid intermediate status if direct transition is blocked
4. Check metadata cache logs to see loaded status codes

#### INVALID_PRIORITY
**Error**: "Invalid ticket priority"
**Cause**: Priority code does not exist in Autotask configuration
**Resolution**:
1. Valid priority codes are typically: 1=Low, 2=Medium, 3=High, 4=Critical, 5=Urgent
2. Check server logs for cached priority values during startup
3. Use `search_tickets` to see priority values on existing tickets

#### INVALID_PUBLISH_LEVEL (Notes)
**Error**: "Invalid publish level: must be 1 (internal) or 3 (external)"
**Cause**: Note publish parameter not set to allowed value
**Resolution**:
1. Use `publish: 1` for internal/staff-only notes
2. Use `publish: 3` for external/customer-visible notes
3. No other publish levels are supported by this feature

#### NOTE_DESCRIPTION_TOO_LONG
**Error**: "Note description exceeds maximum length of 32000 characters"
**Cause**: Note content exceeds Autotask API limit
**Resolution**:
1. Split long notes into multiple shorter notes
2. Consider attaching detailed information as a file instead
3. Summarize content to fit within the 32k character limit

#### AUTHENTICATION_FAILED
**Error**: "Authentication failed"
**Cause**: Invalid or expired Autotask credentials
**Resolution**:
1. Verify `AUTOTASK_USERNAME`, `AUTOTASK_SECRET`, and `AUTOTASK_INTEGRATION_CODE` environment variables
2. Check credentials have not expired in Autotask
3. Ensure integration code is active in Autotask admin panel
4. Test connection using `test_connection` tool

#### PERMISSION_DENIED
**Error**: "Permission denied"
**Cause**: Autotask API user lacks required permissions
**Resolution**:
1. Check correlation ID in error response for tracking
2. Contact Autotask administrator to grant required permissions
3. Required permissions: Tickets (read/write), Notes (create), Resources (read)
4. Verify API security level in Autotask allows the operation

#### RESOURCE_NOT_FOUND
**Error**: "Resource not found"
**Cause**: Ticket, resource, or note ID does not exist
**Resolution**:
1. Verify the ID using search tools (`search_tickets`, `search_resources`)
2. Check for typos in the ID parameter
3. Ensure the resource exists in the Autotask tenant being accessed

#### CONFLICT
**Error**: "Data conflict detected"
**Cause**: Ticket modified by another user since last retrieval
**Resolution**:
1. Refresh ticket data using `get_ticket_details`
2. Reapply changes with current ticket state
3. Consider using `lastActivityDate` for optimistic locking

#### AUTOTASK_SERVER_ERROR
**Error**: "Autotask server error (500/503)"
**Cause**: Autotask API experiencing temporary issues
**Resolution**:
1. Wait 30-60 seconds and retry the operation
2. Check Autotask service status page
3. If persistent, contact Autotask support with correlation ID from logs

### Debugging Tips

#### Enable Verbose Logging
Set environment variable:
```bash
LOG_LEVEL=debug npm start
```

#### Check Correlation IDs
All errors include a correlation ID in format `ERR-<timestamp>-<counter>`. Use this to:
- Correlate errors across logs and client responses
- Track error patterns over time
- Reference when contacting support

#### Inspect Metadata Cache
Check server startup logs for:
```
Loaded X statuses, Y priorities, Z resources
```
Ensure metadata loaded successfully before operations.

#### Validate Payloads
Use validation errors to understand what's wrong:
- Validation errors list ALL issues with the request
- Fix each error listed before retrying
- Check that field names match expected casing

### Performance Considerations

- Note creation completes within 5 seconds under normal conditions
- Ticket updates complete within 5 seconds under normal conditions
- If operations consistently exceed 10 seconds, check network connectivity to Autotask API
- Metadata cache refreshes every 15 minutes; restarts reset the cache

## Sign-off Criteria
- All automated tests pass.
- Manual assignment, status, priority, and note updates succeed.
- Error scenarios provide clear operator guidance with correlation IDs.
- Logs meet observability requirements without leaking sensitive data.
- Troubleshooting guide covers all expected error conditions.
