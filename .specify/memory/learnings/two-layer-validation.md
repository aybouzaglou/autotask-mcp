# Learning: Two-Layer Validation Architecture Discovery

**Date**: 2025-10-19  
**Feature**: 004-mcp-best-practices-review  
**Discovery Phase**: Clarification session (speckit.clarify)  
**Impact**: Constitutional amendment (v1.0.0 → v1.1.0)

---

## Executive Summary

During the clarification phase of feature 004, we discovered existing production code (`TicketUpdateValidator`) that implements sophisticated business logic validation beyond structural type checking. This discovery revealed a critical architectural pattern that was missing from our specifications and constitution: **two-layer validation**.

**Key Insight**: Autotask instances have dynamic, customer-specific configurations. Structural validation (Zod) alone cannot prevent invalid API calls that reference non-existent status IDs, inactive resources, or violate business rules specific to a customer's Autotask configuration.

**Action Taken**: Added Domain Validation Architecture principle to constitution (v1.1.0) and documented pattern in feature 004 spec.

---

## The Discovery

### Context

While implementing validation for `autotask_update_ticket` tool, we found this existing code:

```typescript
// Ensure metadata cache is initialized before validation
await this.autotaskService.ensureMetadataCacheInitialized();

// Validate using the validator
const validator = this.getValidator();
const validated = validator.validateTicketUpdate(updateRequest);

if (!validated.validation.isValid) {
  const mappedError = ErrorMapper.mapValidationErrors(
    validated.validation.errors,
    "update_ticket",
  );
  return {
    content: [{ type: "text", text: JSON.stringify({ isError: true, error: mappedError }) }],
    isError: true,
  };
}
```

**Question**: Why does this custom validator exist? Couldn't Zod handle all validation?

### Analysis

#### What TicketUpdateValidator Does (That Zod Cannot)

**1. Runtime Metadata Validation** (`src/services/ticket-update.validator.ts` lines 50-73):

```typescript
// Validates status against ACTUAL valid statuses from Autotask API
if (request.status !== undefined) {
  if (!this.metadataCache.isValidStatus(request.status)) {
    const validStatuses = this.metadataCache.getAllStatuses()
      .map(s => `${s.id} (${s.name})`)
      .join(', ');
    errors.push(
      `Invalid status ID: ${request.status}. ` +
      `Valid statuses: ${validStatuses}`
    );
  }
}
```

- **Zod can validate**: "Is `status` a positive integer?"
- **Business validator checks**: "Is `status=5` a valid status in THIS customer's Autotask instance?"

**2. Active Resource Validation** (lines 76-91):

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

**Business rule**: Can't assign inactive resources to tickets (not a type constraint).

**3. Content Sanitization** (lines 213-218):

```typescript
private sanitizeNoteContent(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, '\n')  // Normalize Windows line endings
    .replace(/\r/g, '\n');   // Normalize Mac line endings
}
```

**Data transformation**: Normalizes line endings for API consistency (Zod validates, doesn't transform).

#### The TicketMetadataCache Infrastructure

The validator depends on `TicketMetadataCache` (`src/services/ticket-metadata.cache.ts`):

- **Lazy-initializes** on first use
- **Refreshes every 15 minutes** to stay current with Autotask changes
- **Caches**:
  - Ticket statuses (with fallback to defaults if API unavailable)
  - Ticket priorities (with fallback to defaults if API unavailable)
  - Active resources (cached from API, empty if unavailable)
- **Handles failures gracefully** (uses defaults/empty cache rather than blocking operations)

This is **infrastructure for business validation** - not something Zod can provide.

---

## The Pattern: Two-Layer Validation

| Layer | Technology | Purpose | Fails On | Example |
|-------|------------|---------|----------|---------|
| **Layer 1: Structural** | Zod | Type/format validation | Malformed input | "Is `status` a positive integer?" |
| **Layer 2: Business Logic** | Domain Validator | Metadata/business rules | Invalid business state | "Is `status=5` valid for this Autotask instance?" |

### Why Both Layers Matter

**Without Layer 1 (Zod)**: 
- Accept `status: "five"` → waste API call → cryptic Autotask error
- No TypeScript type safety → runtime bugs

**Without Layer 2 (Business Validator)**:
- Accept `status: 99` (doesn't exist) → waste API call → "Invalid status" error without helpful context
- Accept `assignedResourceID: 456` (inactive) → API rejects → confusing error
- No content sanitization → line ending issues in Autotask

**With Both Layers**:
- Fast fail on type errors (microseconds, no API call)
- Contextual business errors with valid options listed
- Sanitized content before API submission
- Optimal user experience and API efficiency

---

## Why This Matters (Brownfield Wisdom)

### The Specification Gap

**Original spec FR-007** (feature 004):
> "All tool parameters MUST be validated using Zod runtime validation with strict mode..."

**What we specified**: Structural validation only  
**What brownfield code has**: Two-layer validation  
**What we needed**: Both layers documented

### The Constitutional Gap

Our constitution had principles for:
- Backend-Only MCP Charter
- Autotask Data Stewardship
- Quality Gates & Test Discipline
- Structured Observability & Error Hygiene
- Secure Configuration & Operational Readiness

**Missing**: Guidance on how to validate Autotask API interactions properly.

---

## Actions Taken

### 1. Updated Constitution (v1.1.0)

Added **Section 6: Domain Validation Architecture** covering:
- Two-layer validation requirement for Autotask operations
- Separation of concerns (structural vs. business logic)
- Metadata caching requirements (15-minute TTL default)
- Contextual error messaging requirements
- Content sanitization guidance

### 2. Updated Feature 004 Spec

Added to `spec.md`:
- **Clarification Q1**: Documented decision to preserve two-layer pattern
- **FR-014**: Formalized two-layer validation requirement for affected tools
- **Assumption 9**: Clarified when two-layer validation applies
- **Dependency 6**: Documented existing validators as dependencies
- **Edge Case**: Guidance on when to use two-layer vs. Zod-only

### 3. Created Deep Analysis Document

`specs/004-mcp-best-practices-review/analysis-custom-validation.md` (482 lines):
- Complete breakdown of TicketUpdateValidator functionality
- Implementation examples for both layers
- Testing implications
- Benefits and tradeoffs
- Impact on tasks

---

## Implementation Guidance

### When to Use Two-Layer Validation

**Use two-layer validation for**:
- Update operations (`autotask_update_ticket`, `autotask_update_company`)
- Operations validating against dynamic Autotask metadata (statuses, priorities, resources)
- Operations with business rules (only active resources, state transitions)
- Operations requiring content sanitization

**Use Zod-only validation for**:
- Search/list operations (no state modification)
- Create operations without complex rules
- Operations with only structural constraints

### Implementation Pattern

```typescript
case "autotask_update_ticket": {
  // Layer 1: Zod structural validation
  const zodValidation = TicketSchemas.UpdateTicket.safeParse(args);
  if (!zodValidation.success) {
    return this.handleValidationError(zodValidation.error, "autotask_update_ticket");
  }
  const structurallyValid = zodValidation.data;
  
  // Layer 2: Business logic validation
  await this.autotaskService.ensureMetadataCacheInitialized();
  const validator = this.getValidator();
  const businessValidation = validator.validateTicketUpdate(structurallyValid);
  
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
  
  // Proceed with sanitized, validated payload
  const { id: _ignored, ...updateFields } = businessValidation.payload;
  result = await this.autotaskService.updateTicket(ticketId, updateFields);
  ...
}
```

### Files to Review

**Existing validators to preserve**:
- `src/services/ticket-update.validator.ts` - TicketUpdateValidator
- `src/services/ticket-metadata.cache.ts` - TicketMetadataCache
- `src/utils/error-mapper.ts` - ErrorMapper (maps validation errors)

**Where pattern should be applied**:
- Task T040: Ticket tools validation integration
- Task T047: Note tools validation integration
- Future: Review all update/create operations for business logic needs

---

## Lessons Learned

### 1. Brownfield Code Contains Architectural Wisdom

The existing `TicketUpdateValidator` wasn't "legacy cruft" - it was a well-designed solution to real problems:
- Customer-specific Autotask configurations
- Dynamic metadata that changes per instance
- Business rules beyond type checking
- Content sanitization requirements

**Lesson**: Always analyze *why* existing patterns exist before replacing them.

### 2. Specifications Must Capture Both Structural and Business Logic

Our initial spec focused on "validation with Zod" without understanding that:
- Type validation is necessary but not sufficient
- Business rules require runtime data from external systems
- Two concerns deserve two layers

**Lesson**: Distinguish structural constraints (universal) from business rules (context-dependent).

### 3. Constitutional Principles Should Guide All Features

Without a constitutional principle, each feature might handle validation differently:
- Feature A: Zod only
- Feature B: Custom validator only
- Feature C: Both layers but inconsistent pattern

**Lesson**: Elevate proven patterns to constitutional principles for consistency.

### 4. Early Discovery Prevents Rework

Finding this during clarification (before implementation) meant:
- No code rewrite needed
- Pattern documented before creating 40+ tools
- Constitution updated to guide future work

**Lesson**: Thorough clarification phase pays dividends in implementation quality.

---

## Follow-Up Actions

### Immediate (Feature 004)
- [x] Update constitution with Domain Validation Architecture principle
- [x] Update spec.md with two-layer validation guidance
- [x] Document pattern in analysis-custom-validation.md
- [ ] Implement pattern in T040 (Ticket tools) and T047 (Note tools)
- [ ] Add unit tests for both validation layers

### Short-Term (Next Sprint)
- [ ] Update `.specify/templates/spec-template.md` with validation architecture section
- [ ] Update `.specify/templates/plan-template.md` with validation approach checklist
- [ ] Review all existing update operations for compliance
- [ ] Document metadata caching patterns in `docs/architecture/`

### Long-Term (Technical Debt)
- [ ] Extract validation pattern into reusable framework
- [ ] Add validation architecture guidance to WARP.md
- [ ] Consider adding validation layer to other Autotask entities (Companies, Contacts, Projects)

---

## Related Resources

- **Constitution**: `.specify/memory/constitution.md` (Section 6: Domain Validation Architecture)
- **Feature Spec**: `specs/004-mcp-best-practices-review/spec.md` (FR-014, Clarification Q1)
- **Deep Analysis**: `specs/004-mcp-best-practices-review/analysis-custom-validation.md`
- **Existing Code**:
  - `src/services/ticket-update.validator.ts`
  - `src/services/ticket-metadata.cache.ts`
  - `src/utils/error-mapper.ts`

---

## Tags

`#architecture` `#validation` `#brownfield-wisdom` `#constitutional-amendment` `#autotask` `#mcp-best-practices` `#two-layer-validation` `#metadata-cache` `#business-rules`

---

**Contributors**: Claude (discovery), Spec 004 clarification workflow  
**Ratified By**: Project maintainers  
**Status**: Approved - Constitution v1.1.0
