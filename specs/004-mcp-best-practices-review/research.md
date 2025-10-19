# Research Findings: MCP Best Practices Compliance

**Feature**: 004-mcp-best-practices-review
**Date**: 2025-10-17
**Research Phase**: Phase 0 - Technical Investigation

## Overview

This document consolidates research on three key technical areas required for MCP best practices compliance:
1. MCP tool annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
2. Zod validation patterns for TypeScript parameter validation
3. Response format strategies (JSON vs Markdown)

---

## 1. MCP Tool Annotations

### Decision

The MCP specification (version 2025-06-18) defines four boolean hint properties in the `ToolAnnotations` interface:

```typescript
export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;       // Default: false
  destructiveHint?: boolean;    // Default: true
  idempotentHint?: boolean;     // Default: false
  openWorldHint?: boolean;      // Default: true
}
```

### Rationale

**readOnlyHint (Default: false)**
- Set to `true` for tools that only read/query data without modifications
- Examples: search_companies, get_ticket_details, test_connection
- Impact: LLMs can execute these without user confirmation

**destructiveHint (Default: true)**
- Set to `true` for irreversible operations (deletes, permanent changes)
- Set to `false` for reversible operations (creates, updates that can be corrected)
- Only meaningful when readOnlyHint is false
- Impact: May trigger additional confirmation prompts

**idempotentHint (Default: false)**
- Set to `true` when repeated calls with same arguments have no additional effect
- Set to `false` when each call produces new side effects (e.g., creating entities with auto-generated IDs)
- Only meaningful when readOnlyHint is false
- Impact: Clients can safely retry idempotent operations

**openWorldHint (Default: true)**
- Set to `true` for tools interacting with external systems (Autotask API, databases, web services)
- Set to `false` for closed-domain operations (local calculations, cache operations)
- Impact: Helps LLMs understand whether results depend on external state

### Classification for Autotask Tools

| Tool Category | readOnlyHint | destructiveHint | idempotentHint | openWorldHint |
|--------------|--------------|-----------------|----------------|---------------|
| Search/List (search_companies, search_tickets) | `true` | N/A | N/A | `true` |
| Get/Read (get_ticket_details, get_ticket_note) | `true` | N/A | N/A | `true` |
| Create (create_ticket, create_company) | `false` | `false` | `false` | `true` |
| Update (update_ticket, update_company) | `false` | `false` | `false` | `true` |
| Test (test_connection) | `true` | N/A | N/A | `true` |

### Alternatives Considered

- **requiresHumanConfirmation**: Found in community discussions but NOT in official MCP specification
- **Custom annotations**: Considered but rejected in favor of standard MCP properties
- **Separate permission system**: Exists at client level, not tool definition level

### Implementation

```typescript
// src/types/mcp.ts - Extend McpTool interface
export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

// Example tool with annotations
{
  name: "autotask_search_companies",
  description: "Search for companies in Autotask...",
  inputSchema: { /* ... */ },
  annotations: {
    title: "Search Companies",
    readOnlyHint: true,
    openWorldHint: true
  }
}
```

---

## 2. Zod Validation Best Practices

### Decision

Use Zod 3.22.4 (already in package.json) with centralized schema registry pattern:

**Structure**:
```
src/
└── utils/
    └── validation/
        ├── company.schemas.ts  # Company tool schemas
        ├── contact.schemas.ts  # Contact tool schemas
        ├── ticket.schemas.ts   # Ticket tool schemas
        └── index.ts            # Exports all schemas
```

**Pattern**: Define Zod schemas with `.strict()` mode, use `z.infer<typeof Schema>` for TypeScript types, generate JSON Schema via `zod-to-json-schema` library.

### Rationale

**Why Zod over Joi/Yup**:
- Already installed (no new dependency for Zod itself)
- Perfect TypeScript integration with type inference
- Smallest bundle size (~45KB vs ~200KB for Joi)
- Best performance for runtime validation
- Native `.strict()` mode for protocol compliance

**Why .strict() Mode**:
- Rejects unexpected properties (MCP protocol compliance)
- Catches typos in parameter names
- Prevents parameter injection attacks
- Provides clear error feedback (FR-007)

**Why Centralized Schema Registry**:
- Single source of truth for validation and types
- Reusable field schemas (PageSize, Email, Phone, Date)
- Easier to maintain than inline schemas
- Optimal for ~40 tools (not overkill like per-file organization)

### Alternatives Considered

**Joi**: Rejected due to poor TypeScript support, large bundle size, and manual type definitions required

**Yup**: Rejected due to limited type inference and moderate bundle size

**Inline Schemas**: Rejected due to duplication and maintenance burden

**Per-Tool Schema Files**: Rejected as overkill for 40 tools (better for 100+ tools)

### Implementation

```typescript
// src/utils/validation/company.schemas.ts
import { z } from 'zod';

export const PageSizeStandardSchema = z.number()
  .int()
  .min(-1, "pageSize must be -1 (unlimited) or positive")
  .max(500, "pageSize cannot exceed 500")
  .optional()
  .describe("Number of results. Default: 50. Set -1 for all (max 500).");

export const SearchCompaniesInputSchema = z.object({
  searchTerm: z.string()
    .min(1, "Search term cannot be empty")
    .optional()
    .describe("Search term for company name"),

  isActive: z.boolean()
    .optional()
    .describe("Filter by active status"),

  pageSize: PageSizeStandardSchema,
}).strict();

export type SearchCompaniesInput = z.infer<typeof SearchCompaniesInputSchema>;

// Generate JSON Schema for MCP tool inputSchema
import { zodToJsonSchema } from 'zod-to-json-schema';

const inputSchema = zodToJsonSchema(SearchCompaniesInputSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'none', // Inline all definitions
  errorMessages: true,
});
```

**Validation in Tool Handler**:
```typescript
case "autotask_search_companies": {
  const validation = SearchCompaniesInputSchema.safeParse(args);

  if (!validation.success) {
    return this.handleValidationError(validation.error, "autotask_search_companies");
  }

  const validatedArgs = validation.data; // Typed correctly
  const result = await this.autotaskService.searchCompanies(validatedArgs);
  return this.formatToolResult(result, `Found ${result.length} companies`);
}
```

**Error Formatting**:
```typescript
private handleValidationError(error: z.ZodError, toolName: string): McpToolResult {
  const details = error.errors.map(err => {
    const field = err.path.join('.');
    return `${field}: ${err.message}`;
  });

  const mappedError = {
    code: 'VALIDATION_ERROR',
    message: 'Invalid parameters provided',
    details,
    guidance: 'Please check the parameter requirements and try again.',
    correlationId: crypto.randomUUID(),
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ isError: true, error: mappedError }, null, 2)
    }],
    isError: true,
  };
}
```

---

## 3. Response Format Strategies (JSON vs Markdown)

### Decision

Add optional `response_format` parameter to all search/list tools with two supported values:
- `"json"` (default): Structured data for programmatic processing
- `"markdown"`: Human-readable formatted output with tables/lists

### Rationale

**Why Two Formats**:
- **JSON**: Best for LLMs processing data, APIs, automated workflows
- **Markdown**: Best for human review, summaries, readability

**Why These Two Specifically**:
- JSON is MCP default and already implemented
- Markdown is universally supported by MCP clients (Claude Desktop, etc.)
- Other formats (CSV, YAML, XML) add complexity without clear UX benefit

**Markdown Formatting Best Practices**:
- Use tables for structured entity lists (companies, tickets, contacts)
- Use headers (##, ###) for clear section separation
- Format timestamps as human-readable dates
- Show pagination guidance clearly
- Indicate truncation with clear messaging

### Alternatives Considered

**CSV Format**: Rejected - not human-readable, no client support for display

**YAML Format**: Rejected - redundant with JSON, parsing complexity

**HTML Format**: Rejected - security concerns, no client support

**Single Format Only**: Rejected - reduces flexibility for different use cases

### Implementation

```typescript
// Add response_format parameter to search tool schemas
export const SearchCompaniesInputSchema = z.object({
  searchTerm: z.string().optional(),
  isActive: z.boolean().optional(),
  pageSize: PageSizeStandardSchema,
  response_format: z.enum(["json", "markdown"])
    .optional()
    .default("json")
    .describe("Response format: 'json' (default) or 'markdown'"),
}).strict();

// Formatting utility
// src/utils/formatting/markdown.formatter.ts
export function formatCompaniesAsMarkdown(companies: any[]): string {
  if (companies.length === 0) {
    return "No companies found.";
  }

  let output = `## Companies (${companies.length} results)\n\n`;
  output += "| ID | Name | Status | Phone |\n";
  output += "|-----|------|--------|-------|\n";

  for (const company of companies) {
    output += `| ${company.id} | ${company.companyName} | ${company.isActive ? 'Active' : 'Inactive'} | ${company.phone || 'N/A'} |\n`;
  }

  return output;
}

// In tool handler
case "autotask_search_companies": {
  const validation = SearchCompaniesInputSchema.safeParse(args);
  if (!validation.success) {
    return this.handleValidationError(validation.error, "autotask_search_companies");
  }

  const { response_format, ...searchArgs } = validation.data;
  const result = await this.autotaskService.searchCompanies(searchArgs);

  if (response_format === "markdown") {
    const markdown = formatCompaniesAsMarkdown(result);
    return {
      content: [{ type: "text", text: markdown }],
    };
  }

  // Default JSON format
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ message: `Found ${result.length} companies`, data: result }, null, 2)
    }],
  };
}
```

**Character Limit Enforcement**:
```typescript
// src/utils/formatting/truncation.ts
const CHARACTER_LIMIT = 25000;

export function enforceCharacterLimit(content: string, toolName: string): string {
  if (content.length <= CHARACTER_LIMIT) {
    return content;
  }

  const truncated = content.substring(0, CHARACTER_LIMIT);
  const guidance = `\n\n[Response truncated at ${CHARACTER_LIMIT} characters. ` +
    `Use filters (searchTerm, isActive) or reduce pageSize to get more focused results.]`;

  return truncated + guidance;
}
```

---

## Summary of Key Decisions

1. **Tool Annotations**: Use all four MCP hint properties with consistent classification across tool categories
2. **Validation**: Zod with `.strict()` mode, centralized schema registry, `zod-to-json-schema` for MCP integration
3. **Response Formats**: JSON (default) + Markdown (optional) with character limit enforcement at 25,000 characters
4. **Dependencies**: Add `zod-to-json-schema` as production dependency (no other new dependencies required)
5. **Structure**: New directories under `src/utils/` for validation schemas and formatting utilities

---

## Implementation Priority

1. **High**: Tool annotations (enables proper MCP client behavior)
2. **High**: Zod validation (protocol compliance, security, UX)
3. **Medium**: Response format support (UX enhancement)
4. **Medium**: Character limit enforcement (safety mechanism)

All research supports the requirements in Feature Specification 004 and aligns with the project constitution.
