# Pagination Guide

## Overview

The Autotask MCP server uses **smart pagination** to balance performance, API efficiency, and user experience. This guide explains how pagination works and how to use it effectively.

## Quick Reference

### Default Behavior

When you search without specifying `pageSize`, you get safe defaults:

```javascript
// Returns 50 companies
search_companies({ searchTerm: "Acme" })

// Returns 25 projects (smaller objects, better performance)
search_projects({ companyID: 12345 })
```

### Explicit Page Sizes

Request a specific number of results:

```javascript
// Get 10 companies
search_companies({ searchTerm: "Tech", pageSize: 10 })

// Get 200 tickets
search_tickets({ status: 1, pageSize: 200 })

// Get maximum (500 for most entities)
search_contacts({ companyID: 999, pageSize: 500 })
```

### Unlimited Results

Use `-1` to fetch all matching records (batched automatically):

```javascript
// Get ALL active companies (fetched in batches of 500)
search_companies({ isActive: true, pageSize: -1 })
```

⚠️ **Warning**: Unlimited mode should only be used when you genuinely need complete datasets. Always use filters to narrow results first.

## Pagination Defaults

### Standard Entities (Default: 50)

These common entities default to 50 results:
- **Companies** (`search_companies`)
- **Contacts** (`search_contacts`)
- **Tickets** (`search_tickets`)

**Why 50?** These are frequently accessed entities where users typically need to see a reasonable set of results without overwhelming the response.

### Medium Entities (Default: 25)

These entities default to 25 results:
- **Resources** (`search_resources`)
- **Configuration Items** (`search_configuration_items`)
- **Contracts** (`search_contracts`)
- **Invoices** (`search_invoices`)
- **Time Entries** (`search_time_entries`)

**Why 25?** These objects are typically larger or used for specialized queries where smaller result sets are more practical.

### API-Limited Entities (Default: 25, Max: 100)

Some Autotask API endpoints have restrictions:
- **Projects** (`search_projects`)
- **Tasks** (`search_tasks`)
- **Quotes** (`search_quotes`)
- **Expense Reports** (`search_expense_reports`)
- **Notes** (all types)

**Why 100 max?** Autotask API limitations prevent larger requests for these entities.

### Special Cases

**Attachments** (`search_ticket_attachments`):
- Default: 10
- Maximum: 50
- **Why?** Attachments include large binary data - smaller pages prevent memory issues.

## Maximum Limits

All page sizes are capped at safe maximums:

| Entity Type | Maximum pageSize |
|-------------|------------------|
| Most entities | 500 |
| API-limited entities | 100 |
| Attachments | 50 |

Requesting more than the maximum will:
1. Be capped at the maximum
2. Log a warning message
3. Still return results (not an error)

## Unlimited Mode (`pageSize: -1`)

### How It Works

When you specify `pageSize: -1`, the server:
1. Fetches results in batches of 500 (or entity maximum)
2. Continues until all matching records are retrieved
3. Returns the complete dataset in a single response
4. Logs warnings about potential performance impact

### When to Use

✅ **Good use cases:**
- Exporting complete datasets for analysis
- Bulk operations across all entities
- Reports requiring comprehensive data
- When you've already applied aggressive filters

❌ **Avoid unlimited mode when:**
- You only need to browse/preview results
- No filters are applied (could return thousands)
- You're working with large object types
- Performance is critical

### Performance Considerations

```javascript
// BAD: No filters + unlimited = potentially thousands of records
search_tickets({ pageSize: -1 })  // ⚠️ Could timeout!

// GOOD: Filtered + unlimited = manageable dataset
search_tickets({
  companyID: 12345,
  status: 1,  // Only "New" status
  pageSize: -1
})
```

## Best Practices

### 1. Use Filters First

Always narrow your search with filters before increasing page size:

```javascript
// Instead of this:
search_companies({ pageSize: 500 })

// Do this:
search_companies({
  searchTerm: "Tech",
  isActive: true,
  pageSize: 50  // or omit for default
})
```

### 2. Start Small, Increase as Needed

```javascript
// Step 1: Start with defaults to see what you have
search_tickets({ companyID: 12345 })  // Gets 50

// Step 2: If you need more, increase gradually
search_tickets({ companyID: 12345, pageSize: 100 })

// Step 3: Only go unlimited if truly necessary
search_tickets({ companyID: 12345, pageSize: -1 })
```

### 3. Consider Response Time

Larger page sizes mean:
- ⏱️ Longer API response times
- 📊 More memory usage
- 🔄 Higher API rate limit consumption
- 📡 Larger network transfers

### 4. Watch for API Rate Limits

Autotask has API rate limits. Unlimited queries consume more quota:

```javascript
// Single request, minimal API usage
search_companies({ isActive: true, pageSize: 50 })

// Multiple batched requests, higher API usage
search_companies({ isActive: true, pageSize: -1 })
```

## Common Patterns

### Pattern 1: Browse and Paginate Manually

```javascript
// Get first page
search_companies({ searchTerm: "Corp", pageSize: 50 })

// If you need more, request next batch
// (Note: Current implementation doesn't support offset, 
//  so increase pageSize or refine filters instead)
search_companies({ searchTerm: "Corp", pageSize: 100 })
```

### Pattern 2: Targeted Searches

```javascript
// Find specific items with precise filters
search_tickets({
  companyID: 12345,
  status: 1,
  assignedResourceID: 42,
  pageSize: 10  // Small page since filters are specific
})
```

### Pattern 3: Complete Dataset Export

```javascript
// Export all contracts for a company
search_contracts({
  companyID: 12345,
  status: 1,  // Only active
  pageSize: -1
})
```

### Pattern 4: Incremental Loading

```javascript
// Start with a preview
const preview = search_companies({ isActive: true, pageSize: 25 })

// If user needs more, load additional results
const moreResults = search_companies({ isActive: true, pageSize: 100 })
```

## Troubleshooting

### "Why am I only getting 50 results?"

You didn't specify `pageSize`, so the default was applied. To get more:

```javascript
search_companies({ searchTerm: "Tech", pageSize: 200 })
```

### "Why is my unlimited query slow?"

Unlimited queries (`pageSize: -1`) fetch all matching records. Solutions:
- Add more filters to narrow results
- Use explicit page sizes instead
- Check if you actually need all results

### "Why did I get a warning about pageSize being capped?"

You requested more than the maximum allowed. The server automatically capped it:

```javascript
// Requested 10000, got 500 with a warning
search_companies({ pageSize: 10000 })  // ⚠️ Capped to 500
```

### "How do I get the next page of results?"

Current implementation returns a single page per request. To get more results:
- Increase `pageSize` to include all needed results
- Use more specific filters to narrow the dataset
- Use `pageSize: -1` for complete datasets (with caution)

## Migration from Earlier Versions

If you're upgrading from an earlier version where all results were returned by default:

**Before:**
```javascript
// Returned ALL companies (could be thousands)
search_companies({ searchTerm: "Tech" })
```

**After:**
```javascript
// Returns 50 companies by default (safe)
search_companies({ searchTerm: "Tech" })

// To get all like before, use -1 explicitly
search_companies({ searchTerm: "Tech", pageSize: -1 })
```

This change prevents accidental large responses that could cause:
- Response size limit errors
- Slow performance
- Excessive API usage
- Memory issues

## API Response Structure

Responses include the items array but currently don't include pagination metadata:

```json
{
  "items": [...],
  "count": 50
}
```

Future versions may include:
- `total`: Total matching records
- `hasMore`: Whether more results exist
- `nextCursor`: Cursor for pagination
- `pageInfo`: Detailed pagination metadata

## Additional Resources

- [Pagination Improvements Technical Documentation](pagination-improvements.md)
- [Architecture Documentation](architecture/)
- [Autotask API Rate Limits](https://ww3.autotask.net/help/DeveloperHelp/Content/AdminSetup/2ExtensionsIntegrations/APIs/REST/API_Throttling.htm)

## Questions?

If you have questions about pagination:
1. Check this guide for common patterns
2. Review the technical documentation
3. Open an issue on GitHub with your use case
