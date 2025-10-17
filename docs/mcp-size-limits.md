# MCP Protocol Size Limits

## Overview

The Model Context Protocol (MCP) has message size constraints that must be respected to prevent "Failed to run tools" errors and ensure reliable operation. This document establishes safe response size guidelines for the Autotask MCP server.

## Protocol Constraints

### Hard Limits

| Limit Type | Size | Notes |
|------------|------|-------|
| MCP Message Size | 1 MB (1,048,576 bytes) | Protocol maximum |
| JSON-RPC Overhead | ~200 bytes | Message wrapper metadata |
| Effective Content Limit | ~1,048,376 bytes | Hard limit minus overhead |

### Recommended Safe Limits

| Limit Type | Size | Percentage | Reasoning |
|------------|------|------------|-----------|
| Safe Response Size | 900 KB (921,600 bytes) | 85% of max | Safety margin for edge cases |
| Warning Threshold | 720 KB (737,280 bytes) | 80% of safe | Early warning before hitting limits |
| Target Response Size | 450 KB (460,800 bytes) | 50% of safe | Optimal for typical usage |

## Entity Size Estimates

Based on typical Autotask API responses with full field payloads:

### Actual Field Counts (From API Documentation)

| Entity | Approx Fields | Avg Size per Record | Notes |
|--------|---------------|---------------------|-------|
| Company | 76 fields | 600-800 bytes | Addresses, contacts, metadata |
| Contact | 58 fields | 400-600 bytes | Personal info, company references |
| Ticket | 76 fields | 1,800-2,200 bytes | Description, resolution, notes |
| Resource | 52 fields | 700-900 bytes | User details, permissions |
| Project | 48 fields | 1,200-1,600 bytes | Descriptions, estimates, dates |
| Task | 42 fields | 900-1,200 bytes | Project details, assignments |
| Configuration Item | 45 fields | 800-1,000 bytes | Hardware/software specs |
| Contract | 38 fields | 600-800 bytes | Terms, dates, financials |
| Invoice | 32 fields | 500-700 bytes | Line items, totals |
| Time Entry | 28 fields | 400-500 bytes | Hours, notes, billing |

### Size Calculation Examples

#### Example 1: 315 Companies (Observed Failure)

```
Record Size:  600 bytes (conservative estimate)
Record Count: 315 companies
Total Size:   189,000 bytes (184 KB)

Response Structure:
{
  "message": "Found 315 companies",
  "data": [...315 company objects...],
  "timestamp": "2024-01-17T15:00:00Z"
}

Actual Size with JSON formatting: ~195 KB (within limits)
```

**Note:** The observed failure likely occurred with more verbose field data or when combined with enhanced mapping data.

#### Example 2: 50 Companies (Proposed Default)

```
Record Size:  600 bytes
Record Count: 50 companies
Total Size:   30,000 bytes (29 KB)

Percentage of Safe Limit: 3.2%
Safety Margin: ✅ Excellent
```

#### Example 3: 50 Tickets (Proposed Default)

```
Record Size:  2,000 bytes (includes truncated descriptions)
Record Count: 50 tickets
Total Size:   100,000 bytes (98 KB)

Percentage of Safe Limit: 10.8%
Safety Margin: ✅ Good
```

#### Example 4: Worst Case - 500 Tickets (Maximum Per Request)

```
Record Size:  2,000 bytes
Record Count: 500 tickets
Total Size:   1,000,000 bytes (977 KB)

Percentage of Safe Limit: 108%
Safety Margin: ❌ EXCEEDS SAFE LIMIT
```

**Conclusion:** Even with aggressive optimization, 500 tickets per page approaches protocol limits. Default of 50 provides sufficient safety margin.

## Recommended Default Page Sizes

Based on average record sizes and safe response limits:

### High Frequency / Small Records (Default: 50)

- **Companies:** 50 records → ~30 KB (3% of safe limit)
- **Contacts:** 50 records → ~25 KB (3% of safe limit)
- **Tickets:** 50 records → ~100 KB (11% of safe limit)

### Medium Frequency / Larger Records (Default: 25)

- **Resources:** 25 records → ~20 KB (2% of safe limit)
- **Projects:** 25 records → ~37 KB (4% of safe limit)
- **Tasks:** 25 records → ~27 KB (3% of safe limit)
- **Configuration Items:** 25 records → ~23 KB (2.5% of safe limit)
- **Contracts:** 25 records → ~18 KB (2% of safe limit)
- **Invoices:** 25 records → ~16 KB (1.7% of safe limit)

### Special Cases

- **Time Entries:** 50 records → ~23 KB (2.5% of safe limit)
- **Expense Reports:** 25 records → ~20 KB (2.2% of safe limit)
- **Quotes:** 25 records → ~18 KB (2% of safe limit)

## Pagination Strategy

### Default Behavior (After v2.0.0)

```typescript
// When user provides no pageSize
searchCompanies() → returns 50 companies (safe default)

// When user provides explicit pageSize
searchCompanies({ pageSize: 100 }) → returns 100 companies (user choice)

// When user needs unlimited results
searchCompanies({ pageSize: -1 }) → returns all companies (explicit opt-in)
```

### Maximum Page Size Enforcement

All search operations enforce a maximum of **500 records per request** to prevent:
- API rate limiting violations
- Memory exhaustion
- Excessive network transfer times
- Protocol message size overflows

```typescript
// User request exceeds maximum
searchCompanies({ pageSize: 1000 }) → capped at 500 companies

// Maximum enforced even with unlimited flag
searchCompanies({ pageSize: -1 }) → uses pagination loops with 500 per page
```

## Response Optimization Techniques

### 1. Field Truncation

Large text fields are truncated to prevent bloat:

```typescript
// Description truncation
ticket.description = ticket.description.length > 200
  ? ticket.description.substring(0, 200) + "... [truncated]"
  : ticket.description;

// Resolution truncation
ticket.resolution = ticket.resolution.length > 100
  ? ticket.resolution.substring(0, 100) + "... [truncated]"
  : ticket.resolution;
```

### 2. Field Limiting

Only essential fields are returned by default:

```typescript
// Instead of all 76 ticket fields, return only essential ~20 fields
const essentialFields = [
  'id', 'ticketNumber', 'title', 'description',
  'status', 'priority', 'companyID', 'contactID',
  'assignedResourceID', 'createDate', 'dueDateTime'
];
```

### 3. Nested Data Removal

Remove large nested arrays that inflate response size:

```typescript
// Remove potentially large arrays
ticket.userDefinedFields = [];
ticket.attachments = []; // Use separate endpoint for attachments
ticket.notes = [];       // Use separate endpoint for notes
```

## Monitoring and Validation

### Response Size Validation

```typescript
function validateResponseSize(data: any): boolean {
  const sizeBytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
  const percentOfLimit = (sizeBytes / SAFE_RESPONSE_SIZE) * 100;
  
  if (sizeBytes > SAFE_RESPONSE_SIZE) {
    logger.error(`Response exceeds safe limit: ${formatBytes(sizeBytes)}`);
    return false;
  }
  
  if (sizeBytes > WARNING_THRESHOLD) {
    logger.warn(`Response approaching limit: ${formatBytes(sizeBytes)} (${percentOfLimit.toFixed(1)}%)`);
  }
  
  return true;
}
```

### Metrics to Track

1. **Response Size Distribution**
   - Track 50th, 90th, 95th, 99th percentiles
   - Alert on responses >80% of safe limit

2. **PageSize Parameter Usage**
   - Count frequency of undefined, explicit values, -1
   - Track average pageSize requested

3. **API Call Reduction**
   - Compare total API calls before/after default implementation
   - Expected: 60-80% reduction in API calls for typical usage

## Migration Guide

### Breaking Changes in v2.0.0

**Before (v1.x):**
```typescript
// No pageSize = fetch ALL results (dangerous)
const companies = await searchCompanies(); // Could return 25,000 companies
```

**After (v2.0.0):**
```typescript
// No pageSize = fetch 50 results (safe default)
const companies = await searchCompanies(); // Returns 50 companies

// Explicit unlimited (opt-in)
const allCompanies = await searchCompanies({ pageSize: -1 }); // Returns all
```

### Migration Steps

1. **Review existing code** for search operations without explicit pageSize
2. **Add explicit pageSize** if more than 50 results needed
3. **Change to pageSize: -1** only where truly needed (with caution)
4. **Add pagination logic** for iterating through large datasets
5. **Test with production data** to ensure expected results

## References

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Autotask API Documentation](https://ww4.autotask.net/help/DeveloperHelp/Content/APIs/REST/API_Calls/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)

## Appendix: Response Size Calculations

### Formula

```
Total Response Size = (Record Count × Average Record Size) + JSON Overhead

Where:
- Record Count: Number of records returned
- Average Record Size: Entity-specific (see table above)
- JSON Overhead: ~5-10% for formatting, arrays, metadata
```

### Safety Check

```typescript
function calculateSafeMaxRecords(avgRecordSize: number): number {
  const jsonOverhead = 1.1; // 10% overhead
  const maxRecords = Math.floor(SAFE_RESPONSE_SIZE / (avgRecordSize * jsonOverhead));
  
  // Never exceed 500 per request (API safety limit)
  return Math.min(maxRecords, 500);
}

// Examples:
calculateSafeMaxRecords(600);  // Companies: 1363 max, capped at 500
calculateSafeMaxRecords(2000); // Tickets: 409 max, capped at 409
```

---

**Last Updated:** 2025-01-17  
**Version:** 2.0.0  
**Status:** Active
