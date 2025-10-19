/**
 * Contract Tool Validation Schemas
 *
 * Zod validation schemas for all Contract-related tools.
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import { PageSizeMediumSchema, SearchTermSchema, PositiveIdSchema } from './common.schemas.js';

/**
 * Search Contracts Tool Parameters
 * Tool: autotask_search_contracts
 */
export const SearchContractsInputSchema = z
  .object({
    searchTerm: SearchTermSchema,
    companyID: PositiveIdSchema.optional(),
    status: z
      .number()
      .int()
      .refine((val) => val === 1 || val === 3, {
        message: 'Contract status must be 1 (In Effect) or 3 (Terminated)',
      })
      .optional(),
    pageSize: PageSizeMediumSchema,
  })
  .strict();

export type SearchContractsInput = z.infer<typeof SearchContractsInputSchema>;

/**
 * Export all Contract schemas as a const object
 */
export const ContractSchemas = {
  SearchContracts: SearchContractsInputSchema,
} as const;
