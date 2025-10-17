# Migration Guide: v1.x → v2.0.0

This guide helps you upgrade from autotask-mcp v1.x to v2.0.0, which introduces **breaking changes to pagination behavior**.

## TL;DR

**What Changed:** All search operations now return **limited results by default** (25-50 records) instead of unlimited results.

**Quick Fix:** If you need all records, add `pageSize: -1` to your search tool calls.

---

## Breaking Changes

### 1. Default Pagination Behavior (BREAKING)

**Before (v1.x):**
```javascript
// Returned ALL matching records (could be hundreds or thousands)
{
  "name": "search_tickets",
  "arguments": {
    "companyID": 12345
  }
}
```

**After (v2.0.0):**
```javascript
// Returns first 50 records only
{
  "name": "search_tickets",
  "arguments": {
    "companyID": 12345
  }
}

// To get all records, explicitly request unlimited
{
  "name": "search_tickets",
  "arguments": {
    "companyID": 12345,
    "pageSize": -1  // ✅ Fetches ALL matching tickets
  }
}
```

### 2. Default Page Sizes by Entity

All search operations now enforce default page sizes:

| Tool | v1.x Default | v2.0.0 Default | v2.0.0 Maximum | Unlimited Supported? |
|------|--------------|----------------|----------------|---------------------|
| `search_companies` | Unlimited | **50** | 500 | ✅ Yes (`-1`) |
| `search_contacts` | Unlimited | **50** | 500 | ✅ Yes (`-1`) |
| `search_tickets` | Unlimited | **50** | 500 | ✅ Yes (`-1`) |
| `search_resources` | Unlimited | **25** | 500 | ✅ Yes (`-1`) |
| `search_configuration_items` | Unlimited | **25** | 500 | ✅ Yes (`-1`) |
| `search_contracts` | Unlimited | **25** | 500 | ✅ Yes (`-1`) |
| `search_invoices` | Unlimited | **25** | 500 | ✅ Yes (`-1`) |
| `search_projects` | Unlimited | **25** | 100 | ⚠️ API limited |
| `search_tasks` | Unlimited | **25** | 100 | ⚠️ API limited |
| `search_quotes` | Unlimited | **25** | 100 | ⚠️ API limited |
| `search_expense_reports` | Unlimited | **25** | 100 | ⚠️ API limited |
| `search_ticket_notes` | Unlimited | **25** | 100 | ⚠️ API limited |
| `search_project_notes` | Unlimited | **25** | 100 | ⚠️ API limited |
| `search_company_notes` | Unlimited | **25** | 100 | ⚠️ API limited |
| `search_ticket_attachments` | Unlimited | **10** | 50 | ❌ No |

---

## Migration Paths

### Option 1: Accept Limited Results (Recommended)

**Most use cases don't need all records.** The new defaults provide better performance and reliability.

**Action:** Review your workflows and use **filters** to narrow results instead of fetching everything:

```javascript
// ❌ Old approach: Get all tickets, filter client-side
{
  "name": "search_tickets",
  "arguments": {
    "pageSize": -1
  }
}

// ✅ New approach: Use server-side filters
{
  "name": "search_tickets",
  "arguments": {
    "status": 1,                // Open tickets only
    "assignedResourceID": 42,   // Specific person
    "companyID": 12345          // Specific company
    // pageSize defaults to 50 - usually enough!
  }
}
```

### Option 2: Explicit Unlimited Pagination

If your workflow **genuinely requires all records**, use `pageSize: -1`:

```javascript
// ✅ Explicitly request all matching records
{
  "name": "search_companies",
  "arguments": {
    "isActive": true,
    "pageSize": -1  // Fetch ALL active companies
  }
}
```

**Note:** 
- Unlimited mode fetches records in batches of 500
- Safety limit: 100 pages (50,000 records max)
- Logs a warning to track usage

### Option 3: Specify Exact Page Size

If you need a specific number of results (e.g., 100):

```javascript
{
  "name": "search_tickets",
  "arguments": {
    "searchTerm": "urgent",
    "pageSize": 100  // Get up to 100 tickets
  }
}
```

---

## Common Scenarios

### Scenario 1: Counting Records

**Before:**
```javascript
// Get all tickets to count them
const result = await client.callTool({
  name: "search_tickets",
  arguments: { companyID: 123 }
});
const count = result.length;  // Could be 500+ tickets
```

**After:**
```javascript
// Use filters and accept approximate counts
const result = await client.callTool({
  name: "search_tickets",
  arguments: { 
    companyID: 123,
    pageSize: 50  // Default, sufficient for trends
  }
});

// Or explicitly get full count
const result = await client.callTool({
  name: "search_tickets",
  arguments: { 
    companyID: 123,
    pageSize: -1  // Get exact count
  }
});
const count = result.length;
```

### Scenario 2: Exporting All Data

**Before:**
```javascript
// Implicitly got everything
const allTickets = await searchTickets({ status: 1 });
```

**After:**
```javascript
// Explicitly request everything
const allTickets = await searchTickets({ 
  status: 1,
  pageSize: -1  // ✅ Required for full export
});
```

### Scenario 3: Batch Processing

**Before:**
```javascript
// Get all unassigned tickets
const tickets = await searchTickets({ 
  unassigned: true 
});

for (const ticket of tickets) {
  await assignTicket(ticket.id);
}
```

**After (Option A - Use unlimited if needed):**
```javascript
// Explicitly get all unassigned
const tickets = await searchTickets({ 
  unassigned: true,
  pageSize: -1  // Process ALL unassigned tickets
});

for (const ticket of tickets) {
  await assignTicket(ticket.id);
}
```

**After (Option B - Process in batches):**
```javascript
// Process first 50, then decide if more needed
const tickets = await searchTickets({ 
  unassigned: true
  // pageSize: 50 is default
});

if (tickets.length > 0) {
  for (const ticket of tickets) {
    await assignTicket(ticket.id);
  }
  
  // If 50 returned, there might be more
  if (tickets.length === 50) {
    console.log("More tickets may exist - consider pageSize: -1");
  }
}
```

### Scenario 4: Building Reports

**Before:**
```javascript
// Get all companies for report
const companies = await searchCompanies({ isActive: true });
generateReport(companies);
```

**After:**
```javascript
// Explicitly get complete dataset
const companies = await searchCompanies({ 
  isActive: true,
  pageSize: -1  // ✅ Full dataset for accurate reports
});
generateReport(companies);
```

---

## Testing Your Migration

### 1. Review Search Tool Usage

Search your codebase for all search tool calls:

```bash
# Find all search tool invocations
grep -r "search_" --include="*.js" --include="*.ts" .
```

### 2. Add Explicit Page Sizes

For each search call, decide:
- **Do I need all records?** → Add `pageSize: -1`
- **Do I need more than the default?** → Add `pageSize: 100` (or appropriate value)
- **Is the default enough?** → No change needed

### 3. Test with Real Data

```bash
# Run pagination tests
npm run test:pagination

# Test your specific workflows
npm test -- tests/your-workflow.test.ts
```

### 4. Monitor Logs

After deployment, watch for warnings about unlimited pagination:

```
WARN: Unlimited pagination requested for search_tickets (pageSize: -1)
```

If you see these frequently, consider whether filters could narrow the results instead.

---

## Why This Change?

### Problems with Unlimited Defaults (v1.x)

1. **Response Size Errors:** Large result sets exceeded MCP's ~1MB message limit
2. **Performance Issues:** Fetching 1000+ records was slow and consumed API rate limits
3. **Memory Problems:** Unbounded results could crash clients with limited memory
4. **Unpredictable Behavior:** Users didn't know how many results to expect

### Benefits of Safe Defaults (v2.0.0)

1. ✅ **Reliable:** Responses stay under size limits, no more "result exceeds maximum length" errors
2. ✅ **Fast:** Smaller result sets = faster API calls and responses
3. ✅ **Predictable:** Users know exactly what to expect (50 or 25 records)
4. ✅ **Efficient:** Encourages proper filtering before fetching data
5. ✅ **Scalable:** Server can handle more concurrent requests

---

## API-Limited Entities

Some Autotask APIs have hard limits regardless of requested page size:

- **Projects, Tasks, Quotes, Expense Reports, Notes:** Max 100 records per request
- **Attachments:** Max 50 records (large binary objects)

For these entities, `pageSize: -1` will respect the API's maximum limit.

---

## Rollback Strategy

If you need to temporarily rollback to v1.x behavior:

```bash
# Downgrade to last v1.x version
npm install autotask-mcp@1.2.0
```

**However**, we strongly recommend migrating to v2.0.0 patterns for long-term reliability.

---

## FAQ

### Q: Why not keep unlimited as default for backward compatibility?

**A:** Unlimited defaults caused critical production issues:
- Response size errors breaking workflows
- Performance degradation under load
- Unpredictable memory usage

Safe defaults prevent these issues and align with API best practices.

### Q: Will `pageSize: -1` always return ALL records?

**A:** Almost always, with two caveats:
1. API-limited entities cap at their maximum (e.g., 100 for projects)
2. Safety limit of 100 pages (50,000 records) prevents infinite loops

### Q: How do I know if I got all results?

**A:** Compare returned count to page size:

```javascript
const results = await searchTickets({ companyID: 123 });

if (results.length === 50) {
  console.log("Might be more - consider pageSize: -1 or add filters");
} else {
  console.log("Got all matching results");
}
```

### Q: What happens if I don't migrate?

**A:** Your search calls will return **fewer results** than before:
- v1.x: All matching records (could be 500+)
- v2.0.0: First 25-50 matching records

**Action required:** Review and update search tool calls.

### Q: Can I use pagination with filters?

**A:** Yes! Filters + pagination is the recommended approach:

```javascript
{
  "name": "search_tickets",
  "arguments": {
    "status": 1,              // Filter first
    "companyID": 12345,       // Narrow results
    "pageSize": 100           // Then request more if needed
  }
}
```

---

## Additional Resources

- **Pagination Guide:** `docs/pagination-guide.md` - Detailed user documentation
- **Technical Details:** `docs/pagination-improvements.md` - Implementation details
- **Size Limits:** `docs/mcp-size-limits.md` - MCP protocol constraints
- **WARP Guide:** `WARP.md` - Developer reference with pagination section

---

## Need Help?

If you encounter issues during migration:

1. Check the [pagination guide](./pagination-guide.md) for detailed examples
2. Review the [CHANGELOG](../CHANGELOG.md) for all changes in v2.0.0
3. Run `npm run test:pagination` to verify behavior
4. Open an issue on GitHub with specific scenarios

---

## Summary Checklist

- [ ] Reviewed all search tool calls in your codebase
- [ ] Added `pageSize: -1` where unlimited results are required
- [ ] Added `pageSize: N` where specific counts are needed
- [ ] Accepted safe defaults (25-50) where appropriate
- [ ] Added filters to narrow results before increasing page size
- [ ] Tested workflows with real Autotask data
- [ ] Monitored logs for unexpected pagination warnings
- [ ] Updated any documentation referencing pagination behavior

**Welcome to v2.0.0!** These changes make autotask-mcp more reliable, performant, and production-ready. 🚀
