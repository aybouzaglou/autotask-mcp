# Quickstart Guide: MCP Best Practices Compliance

**Feature**: 004-mcp-best-practices-review
**Target**: Developers implementing MCP best practices
**Estimated Time**: 30 minutes to understand, 2-3 days to implement

## Overview

This guide helps you understand and implement MCP best practices compliance for the Autotask MCP server. You'll learn how to:

1. Add `autotask_` prefix to all tool names
2. Implement MCP tool annotations
3. Add Zod validation with strict mode
4. Support dual response formats (JSON/Markdown)
5. Enforce character limits with truncation

---

## Prerequisites

- TypeScript 5.3+
- Node.js 20+
- Familiarity with MCP SDK (@modelcontextprotocol/sdk ^1.18.2)
- Basic understanding of Zod validation

---

## Quick Reference

### Tool Name Convention
```typescript
// ❌ OLD (non-compliant)
name: "search_companies"

// ✅ NEW (compliant)
name: "autotask_search_companies"
```

### Tool Annotations
```typescript
// Read-only search tool
annotations: {
  title: "Search Companies",
  readOnlyHint: true,
  openWorldHint: true
}

// Create tool
annotations: {
  title: "Create Ticket",
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true
}
```

### Zod Validation
```typescript
import { z } from 'zod';

const SearchSchema = z.object({
  searchTerm: z.string().min(1).optional(),
  pageSize: z.number().int().min(-1).max(500).optional(),
  response_format: z.enum(["json", "markdown"]).optional().default("json"),
}).strict(); // Reject unexpected properties

type SearchInput = z.infer<typeof SearchSchema>;
```

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
# Add zod-to-json-schema for JSON Schema generation
npm install zod-to-json-schema --save
```

### Step 2: Create Schema Registry

Create `src/utils/validation/common.schemas.ts`:

```typescript
import { z } from 'zod';

export const PageSizeStandardSchema = z.number()
  .int()
  .min(-1, "pageSize must be -1 (unlimited) or positive")
  .max(500, "pageSize cannot exceed 500")
  .optional()
  .describe("Number of results. Default: 50. Set -1 for all (max 500).");

export const ResponseFormatSchema = z.enum(["json", "markdown"])
  .optional()
  .default("json")
  .describe("Response format: 'json' (default) or 'markdown'");
```

Create `src/utils/validation/company.schemas.ts`:

```typescript
import { z } from 'zod';
import { PageSizeStandardSchema, ResponseFormatSchema } from './common.schemas.js';

export const SearchCompaniesInputSchema = z.object({
  searchTerm: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  pageSize: PageSizeStandardSchema,
  response_format: ResponseFormatSchema,
}).strict();

export type SearchCompaniesInput = z.infer<typeof SearchCompaniesInputSchema>;
```

### Step 3: Extend McpTool Interface

Update `src/types/mcp.ts`:

```typescript
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
```

### Step 4: Update Tool Definitions

Update `src/handlers/tool.handler.ts`:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SearchCompaniesInputSchema } from '../utils/validation/company.schemas.js';

async listTools(): Promise<McpTool[]> {
  return [
    {
      name: "autotask_search_companies", // ✅ NEW: Added prefix
      description: "Search for companies in Autotask...",
      inputSchema: zodToJsonSchema(SearchCompaniesInputSchema, {
        target: 'jsonSchema7',
        $refStrategy: 'none',
      }) as any,
      annotations: { // ✅ NEW: Added annotations
        title: "Search Companies",
        readOnlyHint: true,
        openWorldHint: true,
      }
    },
    // ... more tools
  ];
}
```

### Step 5: Add Validation to Tool Handler

```typescript
async callTool(name: string, args: Record<string, any>): Promise<McpToolResult> {
  switch (name) {
    case "autotask_search_companies": {
      // ✅ NEW: Zod validation
      const validation = SearchCompaniesInputSchema.safeParse(args);

      if (!validation.success) {
        return this.handleValidationError(validation.error, name);
      }

      const { response_format, ...searchArgs } = validation.data;
      const result = await this.autotaskService.searchCompanies(searchArgs);

      // ✅ NEW: Format response based on response_format
      if (response_format === "markdown") {
        const markdown = this.formatAsMarkdown(result);
        return { content: [{ type: "text", text: markdown }] };
      }

      // Default JSON response
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: `Found ${result.length} companies`,
            data: result,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }
}

private handleValidationError(error: z.ZodError, toolName: string): McpToolResult {
  const details = error.errors.map(err => {
    const field = err.path.join('.');
    return `${field}: ${err.message}`;
  });

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        isError: true,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid parameters provided',
          details,
          guidance: 'Check parameter requirements and try again.',
          correlationId: crypto.randomUUID(),
        }
      }, null, 2)
    }],
    isError: true,
  };
}
```

### Step 6: Add Markdown Formatting

Create `src/utils/formatting/markdown.formatter.ts`:

```typescript
export function formatCompaniesAsMarkdown(companies: any[]): string {
  if (companies.length === 0) return "No companies found.";

  let output = `## Companies (${companies.length} results)\n\n`;
  output += "| ID | Name | Status | Phone |\n";
  output += "|-----|------|--------|-------|\n";

  for (const company of companies) {
    output += `| ${company.id} | ${company.companyName} | ${company.isActive ? 'Active' : 'Inactive'} | ${company.phone || 'N/A'} |\n`;
  }

  return output;
}
```

### Step 7: Add Character Limit Enforcement

Create `src/utils/formatting/truncation.ts`:

```typescript
const CHARACTER_LIMIT = 25000;

export function enforceCharacterLimit(content: string, toolName: string): string {
  if (content.length <= CHARACTER_LIMIT) return content;

  const truncated = content.substring(0, CHARACTER_LIMIT);
  const guidance = `\n\n[Response truncated at ${CHARACTER_LIMIT} characters. ` +
    `Use filters (searchTerm, isActive) or reduce pageSize for focused results.]`;

  return truncated + guidance;
}
```

---

## Testing Your Implementation

### Test 1: Validate Tool Names

```bash
# List all tools and verify autotask_ prefix
npm run dev:cli

# In MCP client, call:
# tools/list
# Verify all tools start with "autotask_"
```

### Test 2: Validate Annotations

```typescript
// Unit test
describe('Tool Annotations', () => {
  it('should have readOnlyHint for search tools', async () => {
    const tools = await handler.listTools();
    const searchTool = tools.find(t => t.name === 'autotask_search_companies');
    expect(searchTool?.annotations?.readOnlyHint).toBe(true);
  });
});
```

### Test 3: Validate Zod Strict Mode

```typescript
describe('Validation', () => {
  it('should reject unexpected properties', async () => {
    const result = await handler.callTool('autotask_search_companies', {
      searchTerm: 'test',
      unexpectedField: 'bad' // Should be rejected
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('unexpectedField');
  });
});
```

### Test 4: Validate Response Formats

```typescript
describe('Response Formats', () => {
  it('should return JSON by default', async () => {
    const result = await handler.callTool('autotask_search_companies', {
      searchTerm: 'test'
    });

    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty('message');
    expect(response).toHaveProperty('data');
  });

  it('should return Markdown when requested', async () => {
    const result = await handler.callTool('autotask_search_companies', {
      searchTerm: 'test',
      response_format: 'markdown'
    });

    expect(result.content[0].text).toContain('## Companies');
    expect(result.content[0].text).toContain('|');
  });
});
```

### Test 5: Validate Character Limit

```typescript
describe('Character Limit', () => {
  it('should truncate large responses', async () => {
    const result = await handler.callTool('autotask_search_companies', {
      pageSize: -1 // Get all companies
    });

    if (result.content[0].text.length > 25000) {
      expect(result.content[0].text).toContain('[Response truncated at 25,000 characters');
    }
  });
});
```

---

## Common Pitfalls

### ❌ Pitfall 1: Forgetting .strict()

```typescript
// ❌ BAD: No strict mode
const Schema = z.object({ name: z.string() });

// ✅ GOOD: Strict mode enabled
const Schema = z.object({ name: z.string() }).strict();
```

### ❌ Pitfall 2: Using .parse() Instead of .safeParse()

```typescript
// ❌ BAD: Throws exception on validation error
const data = Schema.parse(args);

// ✅ GOOD: Returns result object
const validation = Schema.safeParse(args);
if (!validation.success) {
  // Handle error gracefully
}
```

### ❌ Pitfall 3: Inconsistent Annotations

```typescript
// ❌ BAD: Conflicting annotations
annotations: {
  readOnlyHint: true,
  destructiveHint: true // Meaningless when readOnlyHint is true
}

// ✅ GOOD: Consistent annotations
annotations: {
  readOnlyHint: true,
  openWorldHint: true
}
```

### ❌ Pitfall 4: Not Enforcing Character Limits

```typescript
// ❌ BAD: No truncation
return { content: [{ type: "text", text: largeResponse }] };

// ✅ GOOD: Enforce limit
const truncated = enforceCharacterLimit(largeResponse, toolName);
return { content: [{ type: "text", text: truncated }] };
```

---

## Migration Checklist

- [ ] Install `zod-to-json-schema` dependency
- [ ] Create schema registry under `src/utils/validation/`
- [ ] Create formatter utilities under `src/utils/formatting/`
- [ ] Extend `McpTool` interface with `annotations` field
- [ ] Rename all tools with `autotask_` prefix
- [ ] Add annotations to all 40+ tools
- [ ] Create Zod schemas for all tool parameters
- [ ] Add validation to all tool handlers
- [ ] Add response format support to search tools
- [ ] Add character limit enforcement to all responses
- [ ] Update existing unit tests with new tool names
- [ ] Add new tests for validation, formatting, truncation
- [ ] Update README.md with new tool names
- [ ] Create MIGRATION.md guide for users
- [ ] Run `npm test` and ensure ≥80% coverage maintained
- [ ] Run `npm run lint` and fix any issues

---

## Performance Considerations

| Operation | Overhead | Impact |
|-----------|----------|--------|
| Zod validation | <1ms | Negligible |
| JSON Schema generation | One-time at startup | None at runtime |
| Markdown formatting | 1-5ms | Minimal |
| Character limit check | <1ms | Negligible |
| **Total overhead** | **<10ms** | **Far less than 50-200ms API call** |

---

## Next Steps

After completing this implementation:

1. **Run full test suite**: `npm test && npm run test:coverage`
2. **Validate lint**: `npm run lint`
3. **Build project**: `npm run build`
4. **Test with Claude Desktop**: Update configuration with new tool names
5. **Create migration guide**: Document breaking changes for users
6. **Update documentation**: README.md, docs/, integration guides

---

## Resources

- **MCP Specification**: https://github.com/modelcontextprotocol/specification
- **Zod Documentation**: https://zod.dev/
- **zod-to-json-schema**: https://github.com/StefanTerdell/zod-to-json-schema
- **Feature Specification**: [spec.md](./spec.md)
- **Research Findings**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Contracts**: [contracts/](./contracts/)

---

## Support

If you encounter issues:

1. Review the contracts in `contracts/` for interface definitions
2. Check the research findings in `research.md` for rationale
3. Refer to data-model.md for entity structures
4. Review existing test files for usage examples
5. Check MCP SDK documentation for protocol details

---

**Estimated Implementation Time**: 2-3 days for 40+ tools including testing and documentation.
