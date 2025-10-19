# Custom Validation Analysis: TicketUpdateValidator

**Date**: 2025-10-19  
**Context**: Spec 004 - MCP Best Practices Review, Task T040 (Ticket tools validation)  
**Issue**: Discovered custom validation logic that pre-dates Zod migration

---

## Executive Summary

The `TicketUpdateValidator` class provides **domain-specific business validation** that **cannot be replaced by Zod** and should be preserved alongside Zod schema validation as a **best practice pattern**.

**Recommendation**: Implement a **two-layer validation architecture** documented in our constitution:
1. **Layer 1 (Zod)**: Type checking, structure, basic constraints
2. **Layer 2 (Business)**: Domain rules, external data validation, Autotask-specific logic

---

## What the Custom Validator Does

### 1. Runtime Business Rule Validation

The validator checks input against **dynamic business data** cached from the Autotask API:

```typescript
// Validates status ID against actual Autotask statuses in user's instance
if (request.status !== undefined) {
  if (!this.metadataCache.isValidStatus(request.status)) {
    const validStatuses = this.metadataCache.getAllStatuses()
      .map(s => `${s.id} (${s.name})`)
      .join(', ');
    errors.push(
      `Invalid status ID: ${request.status}. Valid statuses: ${validStatuses}`
    );
  }
}
```

**Why Zod can't do this**: Zod validates against static schemas. It doesn't know which statuses exist in a specific Autotask instance (varies by organization).

### 2. Autotask API-Specific Constraints

Hard limits enforced by Autotask API that would cause silent failures or errors:

```typescript
private readonly MAX_NOTE_LENGTH = 32000;      // Autotask API limit
private readonly MAX_TITLE_LENGTH = 255;       // Autotask API limit
private readonly ALLOWED_PUBLISH_LEVELS: TicketNotePublishLevel[] = [1, 3]; // Internal/External only
```

**Why Zod can't do this fully**: While Zod can enforce max lengths, the validator provides:
- **Business context** in error messages (explains what values mean)
- **Sanitization** (normalizes line endings, trims whitespace)
- **Autotask-specific semantics** (publish level meanings)

### 3. Active Resource Validation

Checks that assigned resources exist AND are currently active:

```typescript
if (request.assignedResourceID !== undefined && request.assignedResourceID !== null) {
  if (!this.metadataCache.isValidResource(request.assignedResourceID)) {
    const resource = this.metadataCache.getResource(request.assignedResourceID);
    if (resource) {
      errors.push(
        `Resource ID ${request.assignedResourceID} is inactive. ` +
        `Only active resources can be assigned to tickets.`
      );
    } else {
      errors.push(
        `Resource ID ${request.assignedResourceID} not found. ` +
        `Ensure the resource exists and is active.`
      );
    }
  }
}
```

**Why Zod can't do this**: Requires querying external system (Autotask API) to check resource status.

### 4. Content Sanitization

Prepares data for Autotask API consumption:

```typescript
private sanitizeNoteContent(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, '\n')  // Normalize Windows line endings
    .replace(/\r/g, '\n');   // Normalize Mac line endings
}
```

**Why Zod can't do this**: Zod validates; it doesn't transform. You'd need `.transform()` chains that blur validation/transformation boundaries.

### 5. Contextual Error Messages

Provides helpful, actionable feedback with domain knowledge:

```typescript
errors.push(
  `Invalid priority ID: ${request.priority}. ` +
  `Valid priorities: 1 (Low), 2 (Medium), 3 (High), 4 (Critical), 5 (Urgent)`
);
```

**Why Zod can't do this well**: Zod error messages are generic. Custom messages require domain knowledge about what the values mean in Autotask context.

---

## TicketMetadataCache Architecture

The validator depends on a **metadata cache service** that:

1. **Lazy-initializes** on first use
2. **Refreshes every 15 minutes** to stay current
3. **Caches**:
   - Ticket statuses (fallback to defaults if API unavailable)
   - Ticket priorities (fallback to defaults if API unavailable)
   - Active resources (cached from API, empty if unavailable)
4. **Handles failures gracefully** (uses defaults/empty cache rather than blocking operations)

This is **infrastructure** for business validation - not schema validation.

---

## Current Usage in Codebase

### 1. autotask_update_ticket (Lines 1511-1587)

```typescript
case "autotask_update_ticket": {
  // ❌ No Zod validation currently
  
  // Ensure metadata cache is initialized
  await this.autotaskService.ensureMetadataCacheInitialized();
  
  // Business validation using TicketUpdateValidator
  const validator = this.getValidator();
  const validated = validator.validateTicketUpdate(updateRequest);
  
  if (!validated.validation.isValid) {
    const mappedError = ErrorMapper.mapValidationErrors(
      validated.validation.errors,
      "update_ticket"
    );
    return { content: [{ type: "text", text: JSON.stringify({ isError: true, error: mappedError }) }], isError: true };
  }
  
  // Use validated payload
  const { id: _ignored, ...updateFields } = validated.payload;
  const updatedTicket = await this.autotaskService.updateTicket(ticketId, updateFields);
}
```

### 2. autotask_create_ticket_note (Lines 1786-1822)

```typescript
case "autotask_create_ticket_note": {
  // ❌ No Zod validation currently
  
  // Ensure metadata cache is initialized
  await this.autotaskService.ensureMetadataCacheInitialized();
  
  // Business validation using TicketUpdateValidator
  const validator = this.getValidator();
  const noteValidation = validator.validateTicketNote({
    ticketID: args.ticketId,
    title: args.title,
    description: args.description,
    publish: args.publish,
  });
  
  if (!noteValidation.validation.isValid) {
    const mappedError = ErrorMapper.mapValidationErrors(
      noteValidation.validation.errors,
      "create_ticket_note"
    );
    return { content: [{ type: "text", text: JSON.stringify({ isError: true, error: mappedError }) }], isError: true };
  }
  
  // Use validated and sanitized payload
  result = await this.autotaskService.createTicketNote(noteValidation.payload);
}
```

---

## Recommended Architecture: Two-Layer Validation

### Layer 1: Zod Schema Validation (Type Safety)

**Purpose**: Catch structural/type errors before expensive operations

**What it validates**:
- Parameter presence (required vs. optional)
- Type correctness (string vs. number vs. boolean)
- Basic constraints (min/max, format, enum)
- Input structure shape

**Example**:
```typescript
const UpdateTicketSchema = z.object({
  id: z.number().int().positive().describe("Ticket ID to update"),
  status: z.number().int().optional().describe("New status ID"),
  priority: z.number().int().optional().describe("New priority ID"),
  assignedResourceID: z.number().int().nullable().optional().describe("Resource ID to assign"),
  title: z.string().max(255).optional().describe("Ticket title"),
  description: z.string().optional().describe("Ticket description"),
  resolution: z.string().optional().describe("Resolution notes"),
  dueDateTime: z.string().datetime().optional().describe("Due date/time"),
}).strict();
```

### Layer 2: Business Validation (Domain Rules)

**Purpose**: Enforce Autotask-specific business rules with contextual feedback

**What it validates**:
- Status IDs exist in user's Autotask instance
- Priority IDs are valid for user's Autotask instance
- Resource IDs exist AND are currently active
- At least one field provided for update operations
- Note content within Autotask API limits (32,000 chars)
- Publish levels are valid (1=Internal, 3=External)
- Content sanitization (line endings, whitespace)

**Example**:
```typescript
// After Zod validation passes
await this.autotaskService.ensureMetadataCacheInitialized();
const validator = this.getValidator();
const businessValidation = validator.validateTicketUpdate(zodValidatedArgs);

if (!businessValidation.validation.isValid) {
  return this.handleValidationError(businessValidation.validation.errors, toolName);
}

// Use sanitized payload from business validator
const finalPayload = businessValidation.payload;
```

---

## Benefits of Two-Layer Approach

### 1. Separation of Concerns

- **Zod**: Static schema validation (fast, no external dependencies)
- **Business**: Dynamic domain validation (requires metadata cache, external data)

### 2. Performance Optimization

- Zod validation fails fast (microseconds) for type errors
- Business validation only runs if Zod passes (avoids unnecessary cache checks)

### 3. Clear Error Attribution

- Type errors: "Parameter `status` must be a number"
- Business errors: "Invalid status ID: 99. Valid statuses: 1 (New), 2 (In Progress), 5 (Complete), ..."

### 4. Maintainability

- Schema changes: Update Zod schema
- Business rule changes: Update validator
- Clear boundary between static and dynamic validation

### 5. Testability

- Mock metadata cache for business validation tests
- Test Zod schemas independently with static data
- Integration tests cover full pipeline

---

## Implementation Pattern

### For update_ticket:

```typescript
case "autotask_update_ticket": {
  // Layer 1: Zod schema validation (type safety)
  const zodValidation = TicketSchemas.UpdateTicket.safeParse(args);
  if (!zodValidation.success) {
    return this.handleValidationError(zodValidation.error, "autotask_update_ticket");
  }
  const zodValidatedArgs = zodValidation.data;
  
  // Layer 2: Business validation (domain rules)
  await this.autotaskService.ensureMetadataCacheInitialized();
  const validator = this.getValidator();
  const businessValidation = validator.validateTicketUpdate({
    id: zodValidatedArgs.id,
    status: zodValidatedArgs.status,
    priority: zodValidatedArgs.priority,
    assignedResourceID: zodValidatedArgs.assignedResourceID,
    queueID: zodValidatedArgs.queueID,
    title: zodValidatedArgs.title,
    description: zodValidatedArgs.description,
    resolution: zodValidatedArgs.resolution,
    dueDateTime: zodValidatedArgs.dueDateTime,
    lastActivityDate: zodValidatedArgs.lastActivityDate,
  });
  
  if (!businessValidation.validation.isValid) {
    const mappedError = ErrorMapper.mapValidationErrors(
      businessValidation.validation.errors,
      "autotask_update_ticket"
    );
    return {
      content: [{ type: "text", text: JSON.stringify({ isError: true, error: mappedError }) }],
      isError: true,
    };
  }
  
  // Use sanitized payload from business validator
  const { id: _ignored, ...updateFields } = businessValidation.payload;
  const updatedTicket = await this.autotaskService.updateTicket(
    zodValidatedArgs.id,
    updateFields
  );
  
  result = {
    ticketId: zodValidatedArgs.id,
    updatedFields: Object.keys(updateFields),
    ticket: updatedTicket,
  };
  message = `Ticket ${zodValidatedArgs.id} updated successfully`;
  break;
}
```

### For create_ticket_note:

```typescript
case "autotask_create_ticket_note": {
  // Layer 1: Zod schema validation (type safety)
  const zodValidation = NoteSchemas.CreateTicketNote.safeParse(args);
  if (!zodValidation.success) {
    return this.handleValidationError(zodValidation.error, "autotask_create_ticket_note");
  }
  const zodValidatedArgs = zodValidation.data;
  
  // Layer 2: Business validation (domain rules + sanitization)
  await this.autotaskService.ensureMetadataCacheInitialized();
  const validator = this.getValidator();
  const businessValidation = validator.validateTicketNote({
    ticketID: zodValidatedArgs.ticketId,
    title: zodValidatedArgs.title,
    description: zodValidatedArgs.description,
    publish: zodValidatedArgs.publish,
  });
  
  if (!businessValidation.validation.isValid) {
    const mappedError = ErrorMapper.mapValidationErrors(
      businessValidation.validation.errors,
      "autotask_create_ticket_note"
    );
    return {
      content: [{ type: "text", text: JSON.stringify({ isError: true, error: mappedError }) }],
      isError: true,
    };
  }
  
  // Use validated and sanitized payload
  result = await this.autotaskService.createTicketNote(businessValidation.payload);
  message = `Note created successfully for ticket ${zodValidatedArgs.ticketId}`;
  break;
}
```

---

## Constitution Amendment Proposal

Add to `specs/004-mcp-best-practices-review/constitution.md`:

### Section: Validation Architecture (NEW)

**Context**: Some tools require validation beyond static schema checking.

**Principle**: Use two-layer validation for tools with dynamic business rules:

1. **Layer 1 (Zod)**: Static schema validation
   - Type checking, structure, basic constraints
   - Fast failure path (no external dependencies)
   - Converts MCP tool parameters to TypeScript types

2. **Layer 2 (Business)**: Domain-specific validation (when needed)
   - Validates against external data (Autotask API metadata)
   - Enforces API-specific constraints (length limits, enum values)
   - Provides contextual error messages with valid options
   - Performs content sanitization for API consumption

**Applies to**:
- `autotask_update_ticket`: Validates status/priority/resource IDs against cached metadata
- `autotask_create_ticket_note`: Validates note constraints + sanitizes content
- (Any future tools that validate against dynamic Autotask data)

**Does NOT apply to**:
- Search tools (no business rules, only type validation)
- Create tools without external validation requirements
- Tools with only static validation needs

**Implementation**:
- Zod validation runs first (fail fast)
- Business validation only runs if Zod passes
- Both layers use consistent error formatting via `ErrorMapper`
- Metadata cache initialization is explicit (`ensureMetadataCacheInitialized()`)

---

## Impact on Tasks

### Tasks to Update:

- **T040** (Integrate Zod validation for Ticket tools):
  - ✅ Add Zod schema for `update_ticket`
  - ✅ Preserve business validation layer
  - ✅ Document two-layer pattern

- **T047** (Integrate Zod validation for Note tools):
  - ✅ Add Zod schema for `create_ticket_note`
  - ✅ Preserve business validation layer
  - ✅ Document two-layer pattern

- **T051** (Generate JSON Schema for Ticket tools):
  - ✅ Generate from Zod schema only
  - Note: Business validation errors won't show in inputSchema (by design - they're runtime)

### Tasks NOT Affected:

All other tasks proceed as planned. Two-layer validation is the **exception**, not the rule.

---

## Testing Implications

### Unit Tests (New):

1. **Test Zod schema validation independently**:
   - Invalid types (string where number expected)
   - Missing required fields
   - Out-of-range values

2. **Test business validation independently** (mock metadata cache):
   - Invalid status ID
   - Invalid priority ID
   - Inactive resource ID
   - Note too long
   - Invalid publish level
   - Content sanitization

### Integration Tests (Existing):

Update existing tests to expect two-layer validation:
- Type errors fail at Zod layer
- Business errors fail at validator layer

---

## Conclusion

The `TicketUpdateValidator` represents **essential business logic** that:
- Cannot be replaced by Zod
- Provides better user experience (contextual errors)
- Enforces Autotask API constraints
- Validates against dynamic external data

**Action**: Document this as a **best practice pattern** in our constitution and implement two-layer validation for affected tools.

**Files to preserve**:
- `src/services/ticket-update.validator.ts`
- `src/services/ticket-metadata.cache.ts`
- `src/utils/error-mapper.ts` (already exists)

**Files to create**:
- Zod schemas for `update_ticket` and `create_ticket_note` (add Layer 1)

**Documentation to update**:
- `specs/004-mcp-best-practices-review/constitution.md` (add Validation Architecture section)
- `specs/004-mcp-best-practices-review/tasks.md` (note two-layer pattern for T040, T047)
