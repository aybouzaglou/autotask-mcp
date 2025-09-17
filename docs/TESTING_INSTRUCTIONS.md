# Testing the Autotask MCP Server

This document provides step-by-step instructions to validate key behaviours in the Autotask MCP server. It now covers the ticket patch tool introduced in Story 1.6 alongside the existing transport and project search checks.

## Prerequisites

1. **Autotask API Credentials**: You need valid Autotask API credentials:
   - API Username (email address)
   - API Secret Key
   - Integration Code

2. **Environment Setup**: Node.js 18+ installed

## Step 1: Set Environment Variables

Create a `.env` file in the project root or export these variables:

```bash
export AUTOTASK_USERNAME="your-api-user@company.com"
export AUTOTASK_SECRET="your-secret-key"
export AUTOTASK_INTEGRATION_CODE="your-integration-code"
```

## Step 2: Build the Project

```bash
npm install
npm run build
```

## Step 3: Test Options

### Regression Suite (All Environments)

Run the full Jest suite to confirm regressions have not been introduced:

```bash
npm test
```

This command compiles the TypeScript sources and exercises the unit/integration coverage, including the new handler logic for `update_ticket`.

### Basic Autotask Connection (Requires Credentials)

When live credentials are available, run the gated connection smoke to ensure Autotask PATCH calls can authenticate successfully:

```bash
AUTOTASK_ENABLE_LIVE_TESTS=true npm test -- basic-autotask-connection
```

The optional flag keeps CI runs stable while still enabling local verification.

### Smithery-Hosted Smoke Test (HTTP Transport)

Use the automated smoke script to verify the Smithery Streamable HTTP endpoint is reachable:

```bash
# Requires SMITHERY_HTTP_URL (and optional auth variables) to be set
export SMITHERY_HTTP_URL="https://your-smithery-endpoint.example"
# Optional:
# export SMITHERY_HTTP_USERNAME="assistant"
# export SMITHERY_HTTP_PASSWORD="secret"
# export SMITHERY_HTTP_TOKEN="Bearer <token>"

npm run test:smithery
```

Expected output includes a 200 status and round-trip latency. Non-200 responses or network failures exit non-zero to flag the run.

### Option A: Direct Service Test (Recommended for Quick Validation)

This tests the AutotaskService directly to confirm the fix:

```bash
node scripts/test-fix-verification.js
```

**Expected Result**: Should retrieve projects without the "Unable to find type" error.

### Option B: Full MCP Server Test

This tests the complete MCP server functionality:

```bash
node scripts/test-mcp-projects.js
```

**Expected Result**: 
- ✅ search_projects tool found in MCP server
- ✅ Tool call succeeds with project data
- ✅ projectType field is present in results

### Option C: Live MCP Server Test

Start the actual MCP server and test with a client:

```bash
# Live Autotask tests are opt-in
export AUTOTASK_ENABLE_LIVE_TESTS=true

# Terminal 1: Start the MCP server
npm start

# Terminal 2: Test with MCP client (if you have one)
# Or use the server in Claude Desktop or other MCP client
```

### Ticket Patch Tool Smoke Test (Story 1.6)

Use the new script to verify `update_ticket` end-to-end against live Autotask data. Always target a sandbox or disposable ticket.

#### Local stdio validation

```bash
# Ensure latest TypeScript build is available
npm run build:ts

# Provide the ticket to patch and the fields to change
node scripts/test-ticket-update.js 123456 status=5 description="Updated via MCP smoke"
```

The script loads your existing `.env` credentials, calls the MCP tool handler directly, and prints the JSON response. A non-zero exit indicates validation failure or Autotask rejecting the PATCH.

#### Hosted/Smithery validation

When running through Smithery, reuse the same command after exporting the hosted environment variables (see "Smithery-Hosted Smoke Test"). The tool handler uses the same credentials regardless of transport, so expect consistent results between local and hosted runs.

## Step 4: Verify the Fix

### Success Indicators:
1. **No 500 errors** with "Unable to find type in the Project Entity"
2. **Projects returned** with valid data including `projectType` field
3. **Tool listed** in available MCP tools (now including `update_ticket`)
4. **Ticket patch succeeds** with confirmation payload when running `scripts/test-ticket-update.js`

### Possible Issues:

#### Issue 1: Still getting "Unable to find type" error
**Solution**: Make sure you ran `npm run build` after the fix

#### Issue 2: Getting 405 Method Not Allowed error
**Cause**: API permissions issue, not our bug
**Solutions**:
- Verify API user has "Projects" module access in Autotask
- Check security level settings
- Ensure API credentials are valid

#### Issue 3: No projects returned but no error
**Cause**: Normal - account may have no projects or access restrictions
**Action**: This is expected behavior, not an error

## Step 5: Test with MCP Clients

### Claude Desktop Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "autotask": {
      "command": "node",
      "args": ["/path/to/autotask-mcp/dist/index.js"],
      "env": {
        "AUTOTASK_USERNAME": "your-api-user@company.com",
        "AUTOTASK_SECRET": "your-secret-key",
        "AUTOTASK_INTEGRATION_CODE": "your-integration-code"
      }
    }
  }
}
```

### Test Commands in Claude:

```
Search for projects in Autotask
```

or

```
List all projects with status and project type information
```

## Expected Behavior After Fix

### Before Fix:
```
❌ Error: Request failed with status code 500
   Message: [ 'Unable to find type in the Project Entity.' ]
```

### After Fix:
```
✅ SUCCESS! Retrieved 5 projects
📋 Sample project data:
{
  id: 12345,
  projectName: "Website Redesign",
  projectType: 1,
  status: 2,
  companyID: 67890
}
```

## Troubleshooting

### Environment Variables Not Loaded
- Ensure `.env` file is in project root
- Check file has proper format (no spaces around `=`)
- Try exporting variables directly in terminal

### Build Issues
```bash
npm run clean
npm install
npm run build
```

### Cross-Transport Parity Checklist

Run the Jest parity suite to confirm stdio and HTTP transports wire up identically:

```bash
npm test -- transport-parity
```

This ensures both transports receive the same MCP server instance and fail gracefully if a transport cannot connect.

Need the legacy HTTP transport integration test as well? Opt in with:

```bash
export AUTOTASK_ENABLE_HTTP_TESTS=true
npm test -- http-transport
```

### Performance Snapshot

- Refer to `docs/transport-performance.md` for the latest latency measurements across local stdio and Smithery-hosted HTTP runs.
- To refresh the hosted numbers, re-run `npm run test:smithery` and append results to the table in that document.
- Local HTTP latency can be sampled by pointing `SMITHERY_HTTP_URL` at a locally running HTTP transport (e.g., `http://127.0.0.1:3000`).

### API Connectivity Issues
1. Test credentials with a simple API call
2. Check Autotask API documentation for your instance
3. Verify firewall/network access

## Contact

If you continue experiencing issues after following these steps, the problem is likely:
1. API permissions (not our bug)
2. Network/connectivity issues
3. Invalid credentials

The core "Unable to find type" error has been resolved with the field name fix from `'type'` to `'projectType'`.
