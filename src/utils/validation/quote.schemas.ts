/**
 * Quote Tool Validation Schemas
 *
 * Zod validation schemas for all Quote-related tools.
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import {
  PageSizeLimitedSchema,
  SearchTermSchema,
  PositiveIdSchema,
  DateStringSchema,
  createStringSchema,
} from './common.schemas.js';

/**
 * Get Quote Tool Parameters
 * Tool: autotask_get_quote
 */
export const GetQuoteInputSchema = z
  .object({
    quoteId: PositiveIdSchema,
  })
  .strict();

export type GetQuoteInput = z.infer<typeof GetQuoteInputSchema>;

/**
 * Search Quotes Tool Parameters
 * Tool: autotask_search_quotes
 */
export const SearchQuotesInputSchema = z
  .object({
    companyId: PositiveIdSchema.optional(),
    contactId: PositiveIdSchema.optional(),
    opportunityId: PositiveIdSchema.optional(),
    searchTerm: SearchTermSchema,
    pageSize: PageSizeLimitedSchema,
  })
  .strict();

export type SearchQuotesInput = z.infer<typeof SearchQuotesInputSchema>;

/**
 * Create Quote Tool Parameters
 * Tool: autotask_create_quote
 */
export const CreateQuoteInputSchema = z
  .object({
    name: createStringSchema(100, 'Quote name', false),
    description: createStringSchema(8000, 'Quote description', false),
    companyId: PositiveIdSchema,
    contactId: PositiveIdSchema.optional(),
    opportunityId: PositiveIdSchema.optional(),
    effectiveDate: DateStringSchema.optional(),
    expirationDate: DateStringSchema.optional(),
  })
  .strict()
  .refine(
    (data) => {
      // If both dates are provided, expirationDate must be >= effectiveDate
      if (data.effectiveDate && data.expirationDate) {
        const effective = new Date(data.effectiveDate);
        const expiration = new Date(data.expirationDate);
        return expiration >= effective;
      }
      return true;
    },
    {
      message: 'Expiration date must be on or after effective date',
      path: ['expirationDate'],
    },
  );

export type CreateQuoteInput = z.infer<typeof CreateQuoteInputSchema>;

/**
 * Export all Quote schemas as a const object
 */
export const QuoteSchemas = {
  GetQuote: GetQuoteInputSchema,
  SearchQuotes: SearchQuotesInputSchema,
  CreateQuote: CreateQuoteInputSchema,
} as const;
