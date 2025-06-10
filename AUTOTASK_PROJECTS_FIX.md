# Autotask MCP Server - Projects Search Bug Fix

## Problem Summary

The MCP server was experiencing two types of errors when searching projects:

1. **500 Internal Server Error**: `"Unable to find type in the Project Entity"`
2. **405 Method Not Allowed**: Request failed with status code 405

## Root Cause Analysis

### Issue 1: Incorrect Field Name (500 Error) ✅ FIXED

**Problem**: The `searchProjects` method in `src/services/autotask.service.ts` was using an incorrect field name `'type'` in the `essentialFields` array.

**Root Cause**: According to the [Autotask REST API documentation for Projects](https://autotask.net/help/developerhelp/Content/APIs/REST/Entities/ProjectsEntity.htm), the correct field name is `'projectType'`, not `'type'`.

**Evidence**: 
- Error message: `"Unable to find type in the Project Entity"`
- Autotask API documentation shows the field is named `projectType` (required integer with picklist values)
- No field named `type` exists in the Projects entity

**Fix Applied**:
- Changed line 650 in `src/services/autotask.service.ts` from `'type'` to `'projectType'`
- Updated the `AutotaskProject` interface in `src/types/autotask.ts` to include the `projectType` field
- Added additional missing fields to the interface for better type support

### Issue 2: HTTP 405 Method Not Allowed ⚠️ NEEDS INVESTIGATION

**Problem**: Some requests return 405 Method Not Allowed errors.

**Possible Causes**:
1. **API Permissions**: The API user may not have sufficient permissions to query projects
2. **Endpoint Configuration**: The Projects endpoint may have specific configuration requirements
3. **Authentication Issues**: Invalid or expired API credentials
4. **Rate Limiting**: API rate limits may be causing some requests to be rejected

**Recommendations**:
1. Verify API user has "Projects" module access and query permissions
2. Check API credentials (username, secret, integration code) are valid and current
3. Test with a minimal query to isolate permission issues
4. Review Autotask security level settings for the API user

## Files Modified

### `src/services/autotask.service.ts`
- **Line 650**: Changed `'type'` to `'projectType'` in essentialFields array

### `src/types/autotask.ts`
- **AutotaskProject interface**: Added missing fields including `projectType`, `projectNumber`, `department`, etc.

### `scripts/test-fix-verification.js` (New)
- Created test script to verify the fix resolves the 500 error

## Testing

Run the verification script to test the fix:

```bash
npm run build
node scripts/test-fix-verification.js
```

**Expected Results**:
- ✅ The 500 "Unable to find type" error should be resolved
- ⚠️ The 405 error may still occur due to permission issues (needs separate investigation)

## Next Steps

1. **Immediate**: Test the field name fix with the verification script
2. **Short-term**: Investigate 405 permission errors by:
   - Verifying API user permissions in Autotask
   - Testing with different query parameters
   - Checking API credential validity
3. **Long-term**: Consider implementing fallback error handling for permission-related issues

## Impact

This fix resolves the primary issue preventing project searches from working in the MCP server. The 500 error was a bug in the server implementation, not the underlying Autotask library.