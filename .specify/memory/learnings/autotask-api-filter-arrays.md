# Autotask API Filter Arrays - Critical Learning

**Date:** 2025-10-19
**Issue:** search_companies tool returning 500+ companies despite filters
**Resolution:** Build proper filter arrays instead of passing raw parameters

## The Problem

The `autotask_search_companies` tool was ignoring `searchTerm` and `isActive` parameters, returning ALL companies (500+) instead of filtered results.

### Root Cause

Raw parameters were being passed directly to the Autotask API:

```typescript
// ❌ BROKEN - API ignores these parameters
const queryOptions = {
  searchTerm: 'acme',
  isActive: true,
  pageSize: 50,
};
await client.accounts.list(queryOptions);
```

The Autotask REST API **requires** filters in a specific array format that it doesn't recognize arbitrary field names.

## The Solution

Build proper filter arrays using the Autotask API filter format:

```typescript
// ✅ CORRECT - API recognizes these filters
const filters = [];

if (options.searchTerm) {
  filters.push({
    op: 'contains',
    field: 'companyName',
    value: options.searchTerm,
  });
}

if (options.isActive !== undefined) {
  filters.push({
    op: 'eq',
    field: 'isActive',
    value: options.isActive,
  });
}

// Default filter if none provided (API requirement)
if (filters.length === 0) {
  filters.push({
    op: 'gte',
    field: 'id',
    value: 0,
  });
}

const queryOptions = {
  filter: filters,
  pageSize: 50,
};
await client.accounts.list(queryOptions);
```

## How autotask-node Works

From `node_modules/autotask-node/dist/entities/accounts.js`:

```javascript
async list(query = {}) {
    const searchBody = {};

    // Converts filter object to array format
    if (!Array.isArray(query.filter)) {
        const filterArray = [];
        for (const [field, value] of Object.entries(query.filter)) {
            filterArray.push({
                "op": "eq",
                "field": field,
                "value": value
            });
        }
        searchBody.filter = filterArray;
    }

    // Sends POST to /Companies/query
    return this.executeQueryRequest(
        async () => this.axios.post(`${this.endpoint}/query`, searchBody)
    );
}
```

**Key insight:** The library can accept `{ filter: { field: value } }` OR `{ filter: [{ op, field, value }] }`, but it does NOT accept arbitrary top-level fields like `{ searchTerm, isActive }`.

## Autotask API Filter Operators

Common operators validated in working code:
- `contains` - Partial string match (case-insensitive)
- `beginsWith` - String starts with (used in searchTickets)
- `eq` - Exact equality
- `ne` - Not equal
- `gte` - Greater than or equal
- `lte` - Less than or equal

## Field Name Mappings

| User Parameter | API Field Name | Operator | Example |
|---------------|---------------|----------|---------|
| `searchTerm` (companies) | `companyName` | `contains` | Search company names |
| `searchTerm` (tickets) | `ticketNumber` | `beginsWith` | Search ticket numbers |
| `isActive` | `isActive` | `eq` | Filter active/inactive |
| `companyId` | `companyID` | `eq` | Filter by company |
| `status` | `status` | `eq` or `ne` | Filter by status |

## Pattern to Follow

All search methods should follow this pattern:

1. **Build filter array** from user parameters
2. **Map user-friendly names** to API field names
3. **Choose appropriate operators** (contains vs eq vs beginsWith)
4. **Provide default filter** if none specified (usually `{ op: 'gte', field: 'id', value: 0 }`)
5. **Pass filter array** in `queryOptions.filter`

## Working Examples in Codebase

### searchTickets (src/services/autotask.service.ts:481-530)
```typescript
const filters: any[] = [];

if (options.searchTerm) {
  filters.push({
    op: 'beginsWith',
    field: 'ticketNumber',
    value: options.searchTerm,
  });
}

const queryOptions = {
  filter: filters,
  pageSize: pageSize!,
};
```

### searchProjects (src/services/autotask.service.ts:871-902)
```typescript
const filters: any[] = [];

if (filters.length === 0) {
  filters.push({
    op: 'gte',
    field: 'id',
    value: 0,
  });
}

const searchBody = {
  filter: filters,
  pageSize: finalPageSize,
};

await (client as any).axios.post('/Projects/query', searchBody);
```

## MCP Best Practices Applied

1. **"Build for Workflows, Not Just API Endpoints"**
   - Filters now enable efficient targeted searches
   - LLMs can find specific companies without bulk data pulls

2. **"Optimize for Limited Context"**
   - Filters apply BEFORE pagination (API-level filtering)
   - Reduces token usage by returning only relevant results

3. **"Design Actionable Error Messages"**
   - Tool description now explains filter behavior clearly
   - Schema descriptions map user parameters to API fields

## Testing Validation

All changes validated against:
- ✅ autotask-node library source code (accounts.js)
- ✅ Working patterns in searchTickets and searchProjects
- ✅ 21 unit tests passing
- ✅ TypeScript strict mode compilation

## Files Changed

- `src/services/autotask.service.ts` - Add filter array building (lines 210-236)
- `src/types/autotask.ts` - Add `isActive` to `AutotaskQueryOptionsExtended`
- `src/handlers/tool.handler.ts` - Improve tool description for LLM guidance
- `src/utils/validation/common.schemas.ts` - Add field descriptions

## Key Takeaway

**Never pass raw user parameters directly to the Autotask API.** Always build proper filter arrays with the format:

```typescript
{
  op: string,      // Operator: 'contains', 'eq', 'ne', etc.
  field: string,   // API field name
  value: any       // Filter value
}
```

This pattern is consistent across ALL Autotask REST API query endpoints.
