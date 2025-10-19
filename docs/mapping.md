# ID-to-Name Mapping

The Autotask MCP server includes intelligent ID-to-name mapping functionality that automatically resolves company and resource IDs to human-readable names. This makes the API responses much more useful for AI assistants and human users.

## 🎯 Data Accuracy Guarantee

**CRITICAL**: All search tools now use **pagination by default** to ensure complete data accuracy. When you search for tickets, projects, or other entities, you get **ALL matching results**, not just the first page. This eliminates the undercounting issues that made previous versions unreliable for reporting and analytics.

- ✅ **Default behavior**: Complete pagination through all results
- ✅ **Optional limiting**: Only specify `pageSize` if you need to limit results  
- ✅ **Accurate reporting**: Perfect for pie charts, dashboards, and analytics

## Features

### Automatic Enhancement
When you use search tools like `autotask_search_tickets`, `autotask_search_projects`, or `autotask_get_ticket_details`, the response automatically includes an `_enhanced` field with resolved names:

```json
{
  "id": 12345,
  "title": "Sample Ticket",
  "companyID": 678,
  "assignedResourceID": 90,
  "_enhanced": {
    "companyName": "Acme Corporation", 
    "assignedResourceName": "John Smith"
  }
}
```

### Intelligent Caching
- Company and resource names are cached for 30 minutes by default
- Cache is automatically refreshed when expired
- Supports bulk lookups for better performance
- Individual lookups for missing IDs

### Mapping Tools

#### `get_company_name`
Get a company name by ID:
```json
{
  "companyId": 678
}
```

Returns:
```json
{
  "id": 678,
  "name": "Acme Corporation",
  "found": true
}
```

#### `get_resource_name`
Get a resource (user) name by ID:
```json
{
  "resourceId": 90
}
```

Returns:
```json
{
  "id": 90,
  "name": "John Smith",
  "found": true
}
```

#### `get_mapping_cache_stats`
View cache statistics:
```json
{}
```

Returns:
```json
{
  "companies": {
    "count": 150,
    "lastUpdated": "2024-01-15T10:30:00Z",
    "isValid": true
  },
  "resources": {
    "count": 45,
    "lastUpdated": "2024-01-15T10:30:00Z", 
    "isValid": true
  }
}
```

#### `clear_mapping_cache`
Clear cached data:
```json
{
  "type": "all"  // or "companies" or "resources"
}
```

#### `preload_mapping_cache`
Preload cache for better performance:
```json
{}
```

## Enhanced Data Fields

The following ID fields are automatically enhanced when present:

### Company Fields
- `companyID` → `_enhanced.companyName`

### Resource Fields
- `assignedResourceID` → `_enhanced.assignedResourceName`
- `ownerResourceID` → `_enhanced.ownerResourceName`
- `projectManagerResourceID` → `_enhanced.projectManagerResourceName`
- `createdByResourceID` → `_enhanced.createdByResourceName`
- `lastModifiedByResourceID` → `_enhanced.lastModifiedByResourceName`
- `submittedByResourceID` → `_enhanced.submittedByResourceName`
- `resourceID` → `_enhanced.assignedResourceName` (for time entries)

## Implementation Details

### MappingService Class
The core mapping functionality is implemented in `src/utils/mapping.service.ts`. It provides:

- Cached lookups with configurable expiry
- Graceful error handling
- Batch operations for efficiency
- Statistics and cache management

### EnhancedAutotaskToolHandler Class
Extends the base tool handler in `src/handlers/enhanced.tool.handler.ts` to:

- Automatically enhance search results
- Add mapping-specific tools
- Maintain backward compatibility
- Handle mapping errors gracefully

### Cache Management
- Default cache expiry: 30 minutes
- Automatic refresh on cache miss
- Bulk loading for initial cache population
- Memory-efficient Map-based storage

## Usage Examples

### Basic Mapping
```javascript
import { MappingService } from './src/utils/mapping.service.js';

const mappingService = new MappingService(autotaskService, logger);

// Get company name
const company = await mappingService.getCompanyName(123);
console.log(company.name); // "Acme Corporation"

// Get resource name  
const resource = await mappingService.getResourceName(456);
console.log(resource.name); // "John Smith"
```

### Batch Operations
```javascript
// Get multiple company names
const companyIds = [123, 456, 789];
const companies = await mappingService.getCompanyNames(companyIds);

companies.forEach(company => {
  console.log(`${company.id}: ${company.name}`);
});
```

### Cache Management
```javascript
// Preload caches for better performance
await mappingService.preloadCaches();

// Check cache statistics
const stats = mappingService.getCacheStats();
console.log(`Companies cached: ${stats.companies.count}`);

// Clear specific cache
mappingService.clearCompanyCache();
```

### Using Enhanced Handler
```javascript
import { EnhancedAutotaskToolHandler } from './src/handlers/enhanced.tool.handler.js';

const handler = new EnhancedAutotaskToolHandler(autotaskService, logger);

// Search tickets with automatic enhancement
const result = await handler.callTool('autotask_search_tickets', { pageSize: 10 });
const tickets = JSON.parse(result.content[0].text).data;

tickets.forEach(ticket => {
  console.log(`Ticket: ${ticket.title}`);
  if (ticket._enhanced?.companyName) {
    console.log(`Company: ${ticket._enhanced.companyName}`);
  }
  if (ticket._enhanced?.assignedResourceName) {
    console.log(`Assigned to: ${ticket._enhanced.assignedResourceName}`);
  }
});
```

## Error Handling

The mapping service handles errors gracefully:

- Network errors return fallback names like "Unknown Company (123)"
- Invalid IDs are handled without throwing exceptions
- Cache errors don't prevent basic functionality
- Mapping failures don't break the main API response

## Performance Considerations

- Cache reduces API calls by up to 95% for repeated lookups
- Bulk operations minimize network round trips
- Async/parallel processing for multiple mappings
- Configurable cache expiry for data freshness balance

## Configuration

The mapping service accepts these constructor parameters:

```javascript
new MappingService(
  autotaskService,    // Required: AutotaskService instance
  logger,             // Required: Logger instance  
  cacheExpiryMs       // Optional: Cache expiry in milliseconds (default: 30 minutes)
)
```

## Testing

Run the mapping tests:

```bash
npm run test:mapping
# or
node scripts/test-mapping.js
```

The test script validates:
- Basic connection to Autotask API
- Company and resource name lookups
- Cache functionality
- Enhanced tool handler responses
- Error handling scenarios 