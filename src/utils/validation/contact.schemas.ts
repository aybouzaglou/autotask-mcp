/**
 * Contact Tool Validation Schemas
 *
 * Zod validation schemas for all Contact-related tools.
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import {
  PageSizeStandardSchema,
  SearchTermSchema,
  PositiveIdSchema,
  PhoneSchema,
  EmailSchema,
  createStringSchema,
} from './common.schemas.js';

/**
 * Search Contacts Tool Parameters
 * Tool: autotask_search_contacts
 *
 * Note: isActive is number type (1=active, 0=inactive) per Autotask API
 */
export const SearchContactsInputSchema = z
  .object({
    searchTerm: SearchTermSchema,
    companyID: PositiveIdSchema.optional(),
    isActive: z
      .number()
      .int()
      .refine((val) => val === 0 || val === 1, {
        message: 'isActive must be 0 (inactive) or 1 (active)',
      })
      .optional(),
    pageSize: PageSizeStandardSchema,
  })
  .strict();

export type SearchContactsInput = z.infer<typeof SearchContactsInputSchema>;

/**
 * Create Contact Tool Parameters
 * Tool: autotask_create_contact
 */
export const CreateContactInputSchema = z
  .object({
    companyID: PositiveIdSchema,
    firstName: createStringSchema(50, 'First name', true) as z.ZodString,
    lastName: createStringSchema(50, 'Last name', true) as z.ZodString,
    emailAddress: EmailSchema.optional(),
    phone: PhoneSchema.optional(),
    title: createStringSchema(50, 'Job title', false),
  })
  .strict();

export type CreateContactInput = z.infer<typeof CreateContactInputSchema>;

/**
 * Export all Contact schemas as a const object
 */
export const ContactSchemas = {
  SearchContacts: SearchContactsInputSchema,
  CreateContact: CreateContactInputSchema,
} as const;
