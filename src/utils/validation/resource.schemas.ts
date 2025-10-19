/**
 * Resource Tool Validation Schemas
 *
 * Zod validation schemas for all Resource (users)-related tools.
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import { PageSizeMediumSchema, SearchTermSchema, BooleanFilterSchema } from './common.schemas.js';

/**
 * Search Resources Tool Parameters
 * Tool: autotask_search_resources
 */
export const SearchResourcesInputSchema = z
  .object({
    searchTerm: SearchTermSchema,
    isActive: BooleanFilterSchema,
    resourceType: z
      .number()
      .int()
      .refine((val) => val >= 1 && val <= 3, {
        message: 'Resource type must be 1 (Employee), 2 (Contractor), or 3 (Temporary)',
      })
      .optional(),
    pageSize: PageSizeMediumSchema,
  })
  .strict();

export type SearchResourcesInput = z.infer<typeof SearchResourcesInputSchema>;

/**
 * Export all Resource schemas as a const object
 */
export const ResourceSchemas = {
  SearchResources: SearchResourcesInputSchema,
} as const;
