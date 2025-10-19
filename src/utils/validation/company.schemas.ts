/**
 * Company Tool Validation Schemas
 *
 * Zod validation schemas for all Company-related tools.
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import {
  PageSizeStandardSchema,
  SearchTermSchema,
  BooleanFilterSchema,
  PositiveIdSchema,
  PhoneSchema,
  createStringSchema,
} from './common.schemas.js';

/**
 * Search Companies Tool Parameters
 * Tool: autotask_search_companies
 */
export const SearchCompaniesInputSchema = z
  .object({
    searchTerm: SearchTermSchema,
    isActive: BooleanFilterSchema,
    pageSize: PageSizeStandardSchema,
  })
  .strict();

export type SearchCompaniesInput = z.infer<typeof SearchCompaniesInputSchema>;

/**
 * Create Company Tool Parameters
 * Tool: autotask_create_company
 */
export const CreateCompanyInputSchema = z
  .object({
    companyName: createStringSchema(100, 'Company name', true) as z.ZodString,
    companyType: PositiveIdSchema,
    phone: PhoneSchema.optional(),
    address1: createStringSchema(128, 'Address line 1', false),
    city: createStringSchema(50, 'City', false),
    state: createStringSchema(25, 'State', false),
    postalCode: createStringSchema(10, 'Postal code', false),
    ownerResourceID: PositiveIdSchema.optional(),
    isActive: BooleanFilterSchema,
  })
  .strict();

export type CreateCompanyInput = z.infer<typeof CreateCompanyInputSchema>;

/**
 * Update Company Tool Parameters
 * Tool: autotask_update_company
 *
 * Follows PATCH semantics: ID required, at least one field must be provided.
 */
export const UpdateCompanyInputSchema = z
  .object({
    id: PositiveIdSchema,
    companyName: createStringSchema(100, 'Company name', false),
    phone: PhoneSchema.optional(),
    address1: createStringSchema(128, 'Address line 1', false),
    city: createStringSchema(50, 'City', false),
    state: createStringSchema(25, 'State', false),
    postalCode: createStringSchema(10, 'Postal code', false),
    isActive: BooleanFilterSchema,
  })
  .strict()
  .refine(
    (data) => {
      // At least one field besides 'id' must be provided
      const fields = Object.keys(data).filter((key) => key !== 'id');
      return fields.length > 0;
    },
    {
      message:
        'At least one field must be provided for update (companyName, phone, address1, city, state, postalCode, isActive)',
    },
  );

export type UpdateCompanyInput = z.infer<typeof UpdateCompanyInputSchema>;

/**
 * Export all Company schemas as a const object
 */
export const CompanySchemas = {
  SearchCompanies: SearchCompaniesInputSchema,
  CreateCompany: CreateCompanyInputSchema,
  UpdateCompany: UpdateCompanyInputSchema,
} as const;
