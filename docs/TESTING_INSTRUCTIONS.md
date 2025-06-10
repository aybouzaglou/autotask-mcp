# Testing the Autotask MCP Server - Project Search Fix

This document provides step-by-step instructions to validate that the project search functionality now works correctly in the MCP server.

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
# Terminal 1: Start the MCP server
npm start

# Terminal 2: Test with MCP client (if you have one)
# Or use the server in Claude Desktop or other MCP client
```

## Step 4: Verify the Fix

### Success Indicators:
1. **No 500 errors** with "Unable to find type in the Project Entity"
2. **Projects returned** with valid data including `projectType` field
3. **Tool listed** in available MCP tools

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