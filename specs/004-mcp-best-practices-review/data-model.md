# Data Model: MCP Best Practices Compliance

**Feature**: 004-mcp-best-practices-review
**Date**: 2025-10-17
**Type**: Refactoring (no new Autotask entities)

## Overview

This feature does not introduce new data entities in the Autotask system. Instead, it defines structural models for MCP tool definitions, validation schemas, and response formats.

---

## 1. Tool Definition Model

### Entity: MCP Tool

Represents an MCP tool exposed by the Autotask server.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | string | Yes | Must start with `autotask_` | Tool identifier (e.g., `autotask_search_companies`) |
| description | string | Yes | Min 10 chars, max 500 chars | Human-readable tool description |
| inputSchema | JSONSchema | Yes | Valid JSON Schema v7 | Parameter schema for the tool |
| annotations | ToolAnnotations | No | Valid MCP annotations | Behavioral hints for MCP clients |

**Relationships**:
- One tool → One input schema (1:1)
- One tool → Optional annotations (1:0..1)

**State Transitions**: N/A (tools are stateless)

**Example**:
```json
{
  "name": "autotask_search_companies",
  "description": "Search for companies in Autotask by name or status",
  "inputSchema": {
    "type": "object",
    "properties": {
      "searchTerm": { "type": "string" },
      "isActive": { "type": "boolean" },
      "pageSize": { "type": "number", "minimum": -1, "maximum": 500 }
    },
    "required": []
  },
  "annotations": {
    "title": "Search Companies",
    "readOnlyHint": true,
    "openWorldHint": true
  }
}
```

---

## 2. Tool Annotations Model

### Entity: ToolAnnotations

Behavioral hints that guide MCP client behavior.

**Fields**:

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| title | string | No | undefined | Max 50 chars | Human-friendly tool name |
| readOnlyHint | boolean | No | false | true/false | Tool only reads data, no modifications |
| destructiveHint | boolean | No | true | true/false | Tool performs irreversible operations |
| idempotentHint | boolean | No | false | true/false | Repeated calls have no additional effect |
| openWorldHint | boolean | No | true | true/false | Tool interacts with external systems |

**Validation Rules**:
- `destructiveHint` only meaningful when `readOnlyHint` is false
- `idempotentHint` only meaningful when `readOnlyHint` is false

**Classification Table** (applies to all Autotask tools):

| Tool Category | readOnlyHint | destructiveHint | idempotentHint | openWorldHint |
|--------------|--------------|-----------------|----------------|---------------|
| Search/List | true | N/A | N/A | true |
| Get/Read | true | N/A | N/A | true |
| Create | false | false | false | true |
| Update | false | false | false | true |
| Test | true | N/A | N/A | true |

---

## 3. Validation Schema Model

### Entity: Zod Input Schema

Runtime validation schema for tool parameters.

**Structure**:
```typescript
// Base schema structure
const InputSchema = z.object({
  // Field definitions with validation rules
}).strict(); // Reject unexpected properties

// Derived TypeScript type
type InputType = z.infer<typeof InputSchema>;
```

**Common Reusable Schemas**:

| Schema Name | Zod Definition | Validation Rules |
|-------------|----------------|------------------|
| PageSizeStandardSchema | `z.number().int().min(-1).max(500).optional()` | -1 (unlimited) or 1-500 |
| PageSizeLimitedSchema | `z.number().int().min(-1).max(100).optional()` | -1 or 1-100 (API limited) |
| PageSizeMediumSchema | `z.number().int().min(-1).max(500).optional()` | Default 25, max 500 |
| PageSizeAttachmentsSchema | `z.number().int().min(1).max(50).optional()` | 1-50 (binary data) |
| EmailSchema | `z.string().email().toLowerCase().trim()` | Valid email format |
| PhoneSchema | `z.string().regex(/^\+?[\d\s\-\(\)]+$/).trim()` | Digits, spaces, hyphens, parens |
| DateStringSchema | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` | YYYY-MM-DD format |
| ISODateTimeSchema | `z.string().datetime()` | ISO 8601 format |

**Validation Error Structure**:
```typescript
{
  code: "VALIDATION_ERROR",
  message: string,           // Human-readable error message
  details: string[],         // Array of field-specific errors
  guidance: string,          // Actionable guidance for user
  correlationId: string      // UUID for error tracking
}
```

---

## 4. Response Format Model

### Entity: Tool Response

Represents a response from a tool execution.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | Array<ContentBlock> | Yes | Response content blocks |
| isError | boolean | No | Whether response represents an error |

**ContentBlock Structure**:
```typescript
{
  type: "text",
  text: string  // JSON or Markdown formatted
}
```

**Response Formats**:

**JSON Format** (default):
```json
{
  "message": "Found 3 companies",
  "data": [
    { "id": 123, "companyName": "Acme Corp", "isActive": true },
    { "id": 456, "companyName": "Globex Inc", "isActive": true },
    { "id": 789, "companyName": "Initech", "isActive": false }
  ],
  "timestamp": "2025-10-17T14:30:00Z"
}
```

**Markdown Format**:
```markdown
## Companies (3 results)

| ID | Name | Status | Phone |
|-----|------|--------|-------|
| 123 | Acme Corp | Active | 555-0100 |
| 456 | Globex Inc | Active | 555-0200 |
| 789 | Initech | Inactive | N/A |
```

**Character Limit**: 25,000 characters (both formats)

**Truncation Message**:
```
[Response truncated at 25,000 characters. Use filters (searchTerm, isActive)
or reduce pageSize to get more focused results.]
```

---

## 5. Tool Parameter Models

### Search Tool Parameters

Common parameters across all search/list tools:

| Parameter | Type | Required | Default | Validation |
|-----------|------|----------|---------|------------|
| searchTerm | string | No | undefined | Min 1 char if provided |
| pageSize | number | No | 50 | -1 (unlimited) or positive integer |
| response_format | enum | No | "json" | "json" or "markdown" |

### Create Tool Parameters

Common validation patterns:

| Parameter Type | Validation Rules |
|----------------|------------------|
| Entity ID (companyID, contactID) | Positive integer |
| Name fields (firstName, lastName) | Min 1 char, max 50 chars |
| Email fields | Valid email format, lowercase |
| Phone fields | Regex: `^\+?[\d\s\-\(\)]+$` |
| Date fields | YYYY-MM-DD format |
| DateTime fields | ISO 8601 format |
| Text fields | Max length (varies: 255 for title, 8000 for description) |

### Update Tool Parameters

All update tools follow PATCH semantics:
- `id` field is required
- At least one update field must be provided
- Omitted fields are not modified

---

## Entity Relationships Diagram

```
┌─────────────────┐
│   MCP Tool      │
│  (Tool Handler) │
└────────┬────────┘
         │
         │ defines
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Input Schema   │────▶│ Zod Validation   │
│  (JSON Schema)  │     │     Schema       │
└────────┬────────┘     └──────────────────┘
         │
         │ annotated with
         ▼
┌─────────────────┐
│ToolAnnotations  │
│ (Behavioral)    │
└─────────────────┘
         │
         │ produces
         ▼
┌─────────────────┐
│ Tool Response   │
│ (JSON/Markdown) │
└─────────────────┘
```

---

## Migration Impact

### Breaking Changes

**Tool Names**: All tool names gain `autotask_` prefix
- Before: `search_companies`
- After: `autotask_search_companies`

**Migration Path**: Update all client configurations (Claude Desktop, scripts) to use new tool names.

### Non-Breaking Changes

- Tool behavior unchanged (same inputs produce same outputs)
- Existing AutotaskService methods unchanged
- Response data structures unchanged (only format options added)
- Transport layer unchanged (stdio/HTTP continue to work)

---

## Validation Strategy

**Layer 1: Zod Structural Validation** (at tool handler boundary)
- Type checking (string, number, boolean)
- Format validation (email, phone, date)
- Range validation (min/max values)
- Required field checking
- Strict mode (reject unexpected properties)

**Layer 2: Business Logic Validation** (at service layer)
- Entity existence (valid company ID, resource ID)
- Status transitions (valid status values from metadata)
- Permissions (resource can perform action)
- Relationships (contact belongs to company)

**Performance**: Zod validation adds <1ms overhead, prevents wasted API calls (50-200ms)

---

## Summary

This feature refactors the tool definition layer without introducing new Autotask data entities. The models defined here represent:

1. **MCP Tool Structure**: Name, description, schema, annotations
2. **Validation Layer**: Zod schemas with strict mode and clear error messages
3. **Response Format**: Dual JSON/Markdown support with character limits
4. **Tool Annotations**: Behavioral hints for MCP client optimization

All models align with MCP specification version 2025-06-18 and maintain backward compatibility for tool behavior while introducing breaking changes to tool names.
