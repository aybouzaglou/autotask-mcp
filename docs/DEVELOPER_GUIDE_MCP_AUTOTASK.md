# MCP Server Development with Autotask API - Complete Developer Guide

## Overview

This guide documents patterns, gotchas, and best practices learned from developing MCP (Model Context Protocol) servers that integrate with Kaseya Autotask PSA. Use this as a reference for future MCP server projects.

## Table of Contents

1. [MCP Server Architecture](#mcp-server-architecture)
2. [Autotask API Integration](#autotask-api-integration)
3. [Common Gotchas & Solutions](#common-gotchas--solutions)
4. [Configuration Management](#configuration-management)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Testing Strategies](#testing-strategies)
7. [Performance Optimization](#performance-optimization)
8. [Debugging Techniques](#debugging-techniques)
9. [Deployment Considerations](#deployment-considerations)
10. [Future Development Patterns](#future-development-patterns)

---

## MCP Server Architecture

### Core Components Structure

```
src/
├── mcp/
│   ├── server.ts           # Main MCP server implementation
│   └── handlers/           # MCP request handlers
├── services/
│   ├── autotask.service.ts # Autotask API wrapper
│   └── mapping.service.ts  # ID-to-name mapping cache
├── handlers/
│   ├── tool.handler.ts     # Tool execution logic
│   └── resource.handler.ts # Resource access logic
├── types/
│   ├── mcp.ts             # MCP-specific types
│   ├── autotask.ts        # Autotask entity types
│   └── config.ts          # Configuration types
└── utils/
    ├── logger.ts          # Centralized logging
    ├── config.ts          # Configuration management
    └── helpers.ts         # Utility functions
```

### Key Design Patterns

#### 1. Service Layer Pattern
```typescript
// Separate API concerns from MCP protocol concerns
class AutotaskService {
  // Pure business logic, no MCP dependencies
  async searchTickets(params: SearchParams): Promise<TicketResult[]>
}

class AutotaskToolHandler {
  // MCP-specific logic, delegates to service
  async callTool(name: string, args: any): Promise<McpResult>
}
```

#### 2. Handler Composition Pattern
```typescript
class AutotaskMcpServer {
  constructor(config: McpServerConfig, logger: Logger) {
    this.autotaskService = new AutotaskService(config, logger);
    this.toolHandler = new ToolHandler(this.autotaskService, logger);
    this.resourceHandler = new ResourceHandler(this.autotaskService, logger);
  }
}
```

#### 3. Configuration Injection Pattern
```typescript
// Centralized config that flows down through all layers
interface McpServerConfig {
  name: string;
  version: string;
  autotask: AutotaskConfig;
  logging: LoggingConfig;
}
```

---

## Autotask API Integration

### Authentication & Zone Discovery

```typescript
// Autotask has distributed endpoints - zone discovery is critical
const autotask = new AutotaskRestApi(
  username,    // Must be API user, not regular user
  secret,      // API secret key
  integrationCode // Required for all requests
);

// Zone discovery happens automatically on first API call
// No need to call zoneInformation separately in v2+
```

### Key API Patterns

#### 1. Field Name Mapping
```typescript
// CRITICAL: Always use official Autotask field names
// Check documentation: https://autotask.net/help/developerhelp/

// ❌ WRONG - Common mistakes:
'type'           // Should be 'projectType' for Projects
'name'           // Should be 'companyName' for Companies  
'description'    // Context matters - could be multiple fields

// ✅ CORRECT - Always verify field names:
'projectType'    // Projects entity
'companyName'    // Companies entity
'ticketNumber'   // Tickets entity
```

#### 2. Essential Fields Strategy
```typescript
// Always specify essential fields to avoid massive responses
const essentialFields = [
  'id',                    // Always include ID
  'companyName',           // Primary display field
  'status',                // Status fields are usually important
  'createDate',            // Timestamps often needed
  'isActive'               // Active status common
];

const result = autotask.Companies.query({
  filter: [...],
  includeFields: essentialFields  // Reduces response size dramatically
});
```

#### 3. Parent-Child Entity Pattern
```typescript
// Many Autotask entities have parent-child relationships
// Query: Use child entity name (e.g., autotask.Contacts)
// CUD Operations: Use parent-child syntax (e.g., autotask.CompanyContacts)

// Query - direct access:
await autotask.Contacts.query({...});

// Create - requires parent ID:
await autotask.CompanyContacts.create(companyId, contactData);
```

### Status and Picklist Values

```typescript
// Status values are entity-specific integers
// Common patterns:
const CommonStatuses = {
  TICKETS: {
    NEW: 1,
    IN_PROGRESS: 2,
    COMPLETE: 5,
    // etc.
  },
  PROJECTS: {
    NEW: 1,
    IN_PROGRESS: 2,
    COMPLETE: 5
  }
};

// Always use fieldInfo() to get valid picklist values:
const fieldInfo = await autotask.Tickets.fieldInfo();
const statusValues = fieldInfo.fields
  .find(f => f.name === 'status')
  ?.picklistValues;
```

---

## Common Gotchas & Solutions

### 1. HTTP 500 "Unable to find [field] in [Entity]"

**Cause**: Using incorrect field names in `includeFields` or filters.

**Solution**: 
- Always check official Autotask REST API documentation
- Use `fieldInfo()` to verify available fields
- Common wrong fields: `type` → `projectType`, `name` → `companyName`

```typescript
// Debug field names:
const info = await autotask.Projects.fieldInfo();
console.log(info.fields.map(f => f.name)); // Lists all valid fields
```

### 2. HTTP 405 Method Not Allowed

**Cause**: API permissions, not code issues.

**Solutions**:
- Verify API user permissions in Autotask admin
- Check module access (Projects, CRM, etc.)
- Ensure API user has appropriate security level
- Some entities are read-only for certain users

### 3. HTTP 401/500 on Authentication

**Cause**: Invalid credentials or integration code.

**Debug**:
```typescript
// Test basic connectivity:
try {
  const company = await autotask.Companies.get(0); // Root company
  console.log('Auth successful:', company.item?.companyName);
} catch (error) {
  console.error('Auth failed:', error.message);
}
```

### 4. Empty Results vs. Access Denied

**Important**: Empty results != error. Many searches legitimately return no data.

```typescript
// Handle both cases:
const results = await autotask.Tickets.query({...});
if (results.items.length === 0) {
  logger.info('No tickets found matching criteria'); // Normal
} else {
  logger.info(`Found ${results.items.length} tickets`);
}
```

### 5. Rate Limiting

**Pattern**: Autotask has undocumented rate limits.

```typescript
class AutotaskService {
  private async makeRequest<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429) {
        await this.delay(1000); // Wait and retry
        return await operation();
      }
      throw error;
    }
  }
}
```

---

## Configuration Management

### Environment Variables Pattern

```typescript
// Use consistent naming:
interface AutotaskConfig {
  username: string;           // AUTOTASK_USERNAME
  secret: string;            // AUTOTASK_SECRET  
  integrationCode: string;   // AUTOTASK_INTEGRATION_CODE
  timeout?: number;          // AUTOTASK_TIMEOUT
  retryAttempts?: number;    // AUTOTASK_RETRY_ATTEMPTS
}

// Validation pattern:
function validateConfig(config: AutotaskConfig): void {
  const required = ['username', 'secret', 'integrationCode'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required config: ${missing.join(', ')}`);
  }
}
```

### Configuration Layering

```typescript
// 1. Default config
const defaultConfig = {
  timeout: 30000,
  retryAttempts: 3,
  logging: { level: 'info' }
};

// 2. Environment override
const envConfig = loadEnvironmentConfig();

// 3. MCP-specific overrides
const mcpConfig = mergeWithMcpConfig(envConfig);

// 4. Final config
const finalConfig = { ...defaultConfig, ...mcpConfig };
```

---

## Error Handling Patterns

### Structured Error Response

```typescript
interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError: boolean;
}

class AutotaskToolHandler {
  async callTool(name: string, args: any): Promise<ToolResult> {
    try {
      const result = await this.executeToolLogic(name, args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{ 
          type: 'text', 
          text: this.formatError(error) 
        }],
        isError: true
      };
    }
  }
}
```

### Error Categorization

```typescript
enum ErrorType {
  AUTHENTICATION = 'authentication',
  PERMISSIONS = 'permissions', 
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error'
}

function categorizeAutotaskError(error: any): ErrorType {
  if (error.status === 401) return ErrorType.AUTHENTICATION;
  if (error.status === 403 || error.status === 405) return ErrorType.PERMISSIONS;
  if (error.status === 400) return ErrorType.VALIDATION;
  if (error.status === 404) return ErrorType.NOT_FOUND;
  if (error.status === 429) return ErrorType.RATE_LIMIT;
  return ErrorType.SERVER_ERROR;
}
```

### User-Friendly Error Messages

```typescript
function formatErrorForUser(error: any): string {
  const type = categorizeAutotaskError(error);
  
  switch (type) {
    case ErrorType.PERMISSIONS:
      return `Access denied. Please check your API user permissions in Autotask admin.`;
    case ErrorType.VALIDATION:
      return `Invalid request: ${error.message}. Please check your input parameters.`;
    case ErrorType.NOT_FOUND:
      return `Resource not found. It may have been deleted or you may not have access.`;
    default:
      return `API error: ${error.message}`;
  }
}
```

---

## Testing Strategies

### Test Categories

#### 1. Unit Tests - Service Layer
```typescript
// Test business logic without MCP or API dependencies
describe('AutotaskService', () => {
  test('should format search filters correctly', () => {
    const service = new AutotaskService(mockConfig, mockLogger);
    const filters = service.buildFilters({ searchTerm: 'test' });
    expect(filters).toEqual([...expectedFilters]);
  });
});
```

#### 2. Integration Tests - API Layer
```typescript
// Test actual API calls with real credentials
describe('Autotask API Integration', () => {
  test('should retrieve companies', async () => {
    const service = new AutotaskService(realConfig, logger);
    const result = await service.searchCompanies({ pageSize: 1 });
    expect(result.companies).toBeDefined();
  });
});
```

#### 3. MCP Protocol Tests
```typescript
// Test MCP server responses
describe('MCP Server', () => {
  test('should list tools correctly', async () => {
    const server = new AutotaskMcpServer(config, logger);
    const tools = await server.toolHandler.listTools();
    expect(tools.find(t => t.name === 'autotask_search_companies')).toBeDefined();
  });
});
```

### Test Utilities

```typescript
// Reusable test patterns:
class TestHelpers {
  static createMockAutotaskResponse<T>(items: T[]) {
    return {
      items,
      pageDetails: {
        count: items.length,
        requestCount: 500,
        prevPageUrl: null,
        nextPageUrl: null
      }
    };
  }
  
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000
  ): Promise<void> {
    // Utility for async testing
  }
}
```

---

## Performance Optimization

### Caching Strategy

```typescript
class MappingService {
  private cache = new Map<string, { value: any; expiry: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  
  async getCompanyName(id: number): Promise<string> {
    const key = `company:${id}`;
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    const company = await this.autotask.Companies.get(id);
    const name = company.item?.companyName || `Company ${id}`;
    
    this.cache.set(key, {
      value: name,
      expiry: Date.now() + this.TTL
    });
    
    return name;
  }
}
```

### Pagination Handling

```typescript
async function getAllResults<T>(
  queryFn: (page: number) => Promise<{ items: T[]; pageDetails: any }>
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const result = await queryFn(page);
    allItems.push(...result.items);
    
    hasMore = result.pageDetails.nextPageUrl !== null;
    page++;
    
    // Safety valve
    if (page > 100) {
      logger.warn('Stopping pagination at 100 pages');
      break;
    }
  }
  
  return allItems;
}
```

### Essential Fields Optimization

```typescript
// Create field sets for different use cases:
const FieldSets = {
  LIST_VIEW: ['id', 'companyName', 'status', 'createDate'],
  DETAIL_VIEW: ['id', 'companyName', 'status', 'createDate', 'address1', 'phone'],
  EXPORT_VIEW: [...ALL_ESSENTIAL_FIELDS]
};

// Use appropriate field set based on context:
const companies = await autotask.Companies.query({
  includeFields: FieldSets.LIST_VIEW, // Much faster
  filter: filters
});
```

---

## Debugging Techniques

### Logging Strategy

```typescript
class Logger {
  debug(message: string, meta?: any): void {
    if (this.level === 'debug') {
      console.log(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  }
  
  logApiCall(method: string, url: string, params?: any, duration?: number): void {
    this.debug(`API Call: ${method} ${url}`, {
      params,
      duration: duration ? `${duration}ms` : undefined
    });
  }
}
```

### API Call Instrumentation

```typescript
class AutotaskService {
  private async instrumentedCall<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    this.logger.debug(`Starting ${operation}`);
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.logger.debug(`Completed ${operation}`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error(`Failed ${operation}`, { 
        error: error.message, 
        duration: `${duration}ms` 
      });
      throw error;
    }
  }
}
```

### Field Validation Debugging

```typescript
async function debugEntityFields(entityName: string): Promise<void> {
  const autotask = new AutotaskRestApi(/* credentials */);
  const entity = autotask[entityName];
  
  try {
    const fieldInfo = await entity.fieldInfo();
    console.log(`\n=== ${entityName} Fields ===`);
    
    fieldInfo.fields.forEach(field => {
      console.log(`${field.name}: ${field.dataType} (required: ${field.isRequired})`);
      
      if (field.isPickList && field.picklistValues) {
        console.log(`  Values: ${field.picklistValues.map(v => `${v.value}=${v.label}`).join(', ')}`);
      }
    });
  } catch (error) {
    console.error(`Failed to get field info for ${entityName}:`, error.message);
  }
}
```

---

## Deployment Considerations

### Preferred: Smithery Hosting

- Keep `smithery.yaml` minimal (`runtime: "typescript"`) so Smithery auto-detects the build.
- Ensure `package.json#module` points at `src/index.ts` with a default `createServer` export and optional `configSchema`.
- Before clicking **Deploy** in Smithery, run `npm run build` locally to surface TypeScript issues.
- Smithery exposes deployments over HTTPS (`https://server.smithery.ai/<slug>/mcp`) and will call `initialize`/`list_tools` automatically after each build.
- Use Smithery’s session configuration UI to capture `AUTOTASK_*` credentials instead of baking them into the image.
- Prompt summary: `autotaskUsername`, `autotaskSecret`, and `autotaskIntegrationCode` are required; optional fields include `autotaskApiUrl`, `logLevel`, `logFormat`, and the transport/auth trio. For hosted runs leave `transport=http` so Smithery proxies stdio over Streamable HTTP.

#### Hosted Streamable HTTP Smoke Test

1. Authenticate the CLI (`npx @smithery/cli@latest login`) or set `SMITHERY_API_KEY` in the environment.
2. Launch a tunnel and capture the connection URL:
   ```bash
   SMITHERY_API_KEY=... \
     npx @smithery/cli@latest run @aybouzaglou/autotask-mcp \
       --profile medical-termite-hpQdg6 --playground --no-open
   ```
3. Issue verification calls to the generated URL:
   ```bash
   curl -sS -X POST "<URL>" -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":"tools","method":"tools/list"}'

   curl -sS -X POST "<URL>" -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":"resources","method":"resources/list"}'

   curl -sS -X POST "<URL>" -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":"status","method":"tools/call","params":{"name":"autotask_test_connection"}}'
   ```
4. Capture noted headers (`Mcp-Session-Id`, SSE events) and document anomalies in Story 1.3 / 1.5 as follow-up items.

> The historical `connect` command has been superseded by `run --playground`; reuse this procedure if the CLI introduces `connect` again.

### Legacy Containers (Use with Caution)

- The published Dockerfile currently launches `dist/index.js`, which only exports the Smithery factory. Swap to `node dist/cli.js` if you need containers.
- Implement a real MCP HTTP transport before exposing `AUTOTASK_TRANSPORT=http`; the included stub only returns a placeholder response.
- Update Docker health checks to issue MCP-compliant POST requests; GET health checks fail with 405.

### Environment Setup

```bash
# Production environment checklist:
export AUTOTASK_USERNAME="prod-api-user@company.com"  # Dedicated API user
export AUTOTASK_SECRET="secure-secret-key"            # Rotate regularly
export AUTOTASK_INTEGRATION_CODE="prod-integration"   # Production integration
export LOG_LEVEL="info"                               # Reduce log verbosity
export NODE_ENV="production"                          # Enable optimizations
```

### Health Checks

```typescript
class HealthCheckHandler {
  async checkHealth(): Promise<{ status: string; details: any }> {
    try {
      // Test basic connectivity
      const company = await this.autotask.Companies.get(0);
      
      return {
        status: 'healthy',
        details: {
          autotask_connection: 'ok',
          root_company: company.item?.companyName || 'unknown',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          autotask_connection: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
```

### Process Management

```typescript
// Graceful shutdown handling:
class AutotaskMcpServer {
  async stop(): Promise<void> {
    this.logger.info('Stopping MCP Server...');
    
    // Close connections
    await this.server.close();
    
    // Clear caches
    this.mappingService.clearCache();
    
    // Final log
    this.logger.info('MCP Server stopped gracefully');
  }
}

// Signal handling:
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});
```

---

## Future Development Patterns

### Extensible Tool Architecture

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

class ExtensibleToolHandler {
  private tools = new Map<string, ToolDefinition>();
  
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }
  
  async callTool(name: string, args: any): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    
    return await tool.handler(args);
  }
}
```

### Plugin System

```typescript
interface McpPlugin {
  name: string;
  version: string;
  tools?: ToolDefinition[];
  resources?: ResourceDefinition[];
  initialize(server: AutotaskMcpServer): Promise<void>;
}

class PluginManager {
  private plugins: McpPlugin[] = [];
  
  async loadPlugin(plugin: McpPlugin): Promise<void> {
    await plugin.initialize(this.server);
    this.plugins.push(plugin);
  }
}
```

### Configuration Schema Evolution

```typescript
// Versioned configuration for backward compatibility:
interface ConfigV1 {
  version: '1.0';
  autotask: AutotaskConfig;
}

interface ConfigV2 extends ConfigV1 {
  version: '2.0';
  features: FeatureFlags;
  plugins: PluginConfig[];
}

function migrateConfig(config: any): ConfigV2 {
  if (config.version === '1.0') {
    return {
      ...config,
      version: '2.0',
      features: getDefaultFeatures(),
      plugins: []
    };
  }
  return config;
}
```

---

## Key Takeaways

### Do's ✅
- Always verify Autotask field names against official documentation
- Use essential fields to optimize performance
- Implement comprehensive error handling with user-friendly messages
- Cache frequently accessed data (company names, resource names)
- Test with real API credentials, not just mocks
- Handle both empty results and actual errors gracefully
- Use structured logging for debugging

### Don'ts ❌
- Don't assume field names match intuitive expectations
- Don't ignore 405 errors - they indicate permission issues
- Don't fetch all fields if you only need a few
- Don't rely solely on unit tests - integration tests are crucial
- Don't hardcode status values - use fieldInfo() to get valid options
- Don't forget parent-child entity relationships for CUD operations

### Common Field Name Gotchas
```typescript
// Entity-specific field mappings to remember:
const FieldMappings = {
  Projects: {
    wrong: 'type',
    correct: 'projectType'
  },
  Companies: {
    wrong: 'name',
    correct: 'companyName'
  },
  Contacts: {
    wrong: 'name',
    correct: 'firstName + lastName' // Two separate fields
  },
  Tickets: {
    wrong: 'number',
    correct: 'ticketNumber'
  }
};
```

This guide should serve as a comprehensive reference for building MCP servers with Autotask API integration. Keep it updated as new patterns and gotchas are discovered. 
