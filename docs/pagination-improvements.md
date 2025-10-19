# Pagination Improvements Summary

## Overview
Standardized pagination behavior across all search operations in the Autotask MCP server to provide safe defaults, consistent user experience, and prevent accidental large-result requests.

## Changes Made

### Service Layer (`src/services/autotask.service.ts`)

#### New Helper Method
Added `resolvePaginationOptions()` private method that:
- Provides entity-specific safe defaults (25, 50, or 100 depending on entity type)
- Handles `undefined`, `0`, and explicit page size values
- Supports unlimited results via `-1` (explicit opt-in)
- Caps all page sizes at maximum of 500
- Logs warnings for unlimited requests and cap adjustments

#### Updated Search Methods
Applied `resolvePaginationOptions()` to all search operations:

**Standard Default (50 items):**
- `searchCompanies()` - Default: 50, Max: 500, Unlimited: supported
- `searchContacts()` - Default: 50, Max: 500, Unlimited: supported  
- `searchTickets()` - Default: 50, Max: 500, Unlimited: supported

**Medium Default (25 items):**
- `searchTimeEntries()` - Default: 25, Max: 500, Unlimited: supported
- `searchResources()` - Default: 25, Max: 500, Unlimited: supported
- `searchExpenseReports()` - Default: 25, Max: 100
- `searchQuotes()` - Default: 25, Max: 100
- `searchConfigurationItems()` - Default: 25, Max: 500, Unlimited: supported
- `searchContracts()` - Default: 25, Max: 500, Unlimited: supported
- `searchInvoices()` - Default: 25, Max: 500, Unlimited: supported

**Limited Default (25 items with API constraints):**
- `searchProjects()` - Default: 25, Max: 100 (API limitation)
- `searchTasks()` - Default: 25, Max: 100 (API limitation)

### Tool Handler (`src/handlers/tool.handler.ts`)

#### New Pagination Constants
```typescript
const PAGE_SIZE_STANDARD = {
  type: "number",
  description: "Number of results (default: 50, max: 500). Use -1 for unlimited (may be slow). Tip: Use filters to narrow results before increasing pageSize.",
  minimum: -1,
  maximum: 500,
};

const PAGE_SIZE_MEDIUM = {
  type: "number",
  description: "Number of results (default: 25, max: 500). Use -1 for unlimited (may be slow). Tip: Use filters to narrow results before increasing pageSize.",
  minimum: -1,
  maximum: 500,
};

const PAGE_SIZE_LIMITED = {
  type: "number",
  description: "Number of results (default: 25, max: 100). Use -1 for up to 100 results. Note: This endpoint has API limitations.",
  minimum: -1,
  maximum: 100,
};

const PAGE_SIZE_ATTACHMENTS = {
  type: "number",
  description: "Number of results (default: 10, max: 50). Attachments are large binary objects - use small pageSizes to manage response size.",
  minimum: 1,
  maximum: 50,
};
```

#### Updated Tool Schemas
Replaced inline `pageSize` schemas with reusable constants:

**Using PAGE_SIZE_STANDARD (default 50, max 500):**
- autotask_search_companies
- autotask_search_contacts
- autotask_search_tickets

**Using PAGE_SIZE_MEDIUM (default 25, max 500):**
- autotask_search_resources
- autotask_search_configuration_items
- autotask_search_contracts
- autotask_search_invoices

**Using PAGE_SIZE_LIMITED (default 25, max 100):**
- autotask_search_projects
- autotask_search_tasks
- autotask_search_ticket_notes
- autotask_search_project_notes
- autotask_search_company_notes
- autotask_search_expense_reports
- autotask_search_quotes

**Using PAGE_SIZE_ATTACHMENTS (default 10, max 50):**
- autotask_search_ticket_attachments

#### Enhanced Tool Descriptions
All search tool descriptions now include:
- Explicit default page size
- Guidance to use filters before increasing page size
- Maximum limits and API constraints where applicable

## Behavior Changes

### Before
- Missing or `0` pageSize → undefined behavior (often returned all results)
- No warnings for large requests
- Inconsistent defaults across entities
- No safe guards against unbounded queries

### After
- Missing or `0` pageSize → safe entity-specific default (25 or 50)
- `-1` pageSize → explicit unlimited opt-in with warnings
- Explicit page size → capped at entity maximum (100 or 500)
- Consistent behavior across all search operations
- Automatic batching for unlimited requests (fetch in 500-item chunks)

## Examples

### Default Behavior
```typescript
// Before: Might return all companies (thousands)
searchCompanies({})

// After: Returns exactly 50 companies
searchCompanies({})  // ← applies default pageSize: 50
```

### Explicit Page Size
```typescript
// Before: No cap, could request 10,000 items
searchCompanies({ pageSize: 10000 })

// After: Capped at 500 with warning
searchCompanies({ pageSize: 10000 })  // ← capped to 500, warning logged
```

### Unlimited Results
```typescript
// Before: No explicit way to request all results
searchCompanies({ pageSize: 999999 })

// After: Explicit opt-in with warnings
searchCompanies({ pageSize: -1 })  // ← fetches all in 500-item batches, warning logged
```

### Filtering First
```typescript
// Recommended pattern for large result sets
searchCompanies({ searchTerm: "Acme", isActive: true })  // ← 50 filtered results
```

## Testing

All changes verified by:
- ✅ Build: `npm run build` (successful)
- ✅ Lint: `npm run lint` (passing)
- ✅ Tests: `npm test` (85 passed, 2 skipped, 10 todo)

## Impact

### User Experience
- **Safer**: Prevents accidental large requests
- **Predictable**: Consistent defaults across all entities
- **Flexible**: Supports small, large, and unlimited queries
- **Guided**: Clear descriptions help users understand limits

### Performance
- **Faster**: Default queries return manageable result sets
- **Scalable**: Batched fetching for unlimited requests
- **Efficient**: Encourages filter usage before pagination

### Maintainability
- **DRY**: Reusable pagination constants eliminate duplication
- **Testable**: Centralized logic simplifies testing
- **Extensible**: Easy to add new entity types with proper defaults

## Migration Notes

### For API Users
- **No breaking changes**: All existing explicit `pageSize` values still work
- **Automatic migration**: Missing/zero page sizes now use safe defaults
- **New capability**: Use `-1` for unlimited results (opt-in)

### For Developers
- **New pattern**: Use `resolvePaginationOptions()` for all new search methods
- **Constants**: Use `PAGE_SIZE_*` constants in tool schemas
- **Consistency**: Follow established default patterns (50 for common, 25 for specialized)

## Future Enhancements

Potential improvements:
1. Add per-user pagination preferences
2. Implement cursor-based pagination for large result sets
3. Add pagination metadata (total count, has_more, etc.)
4. Support server-side result streaming
5. Add rate limiting for unlimited requests

## Related Documentation

- Architecture: `docs/architecture/`
- Transport Performance: `docs/transport-performance.md`
- Source Tree: `docs/architecture/source-tree.md`
