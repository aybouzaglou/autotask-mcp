/**
 * Common Validation Schemas
 *
 * Reusable Zod schemas for common parameter types used across all tools.
 * All schemas follow MCP best practices with strict mode and clear error messages.
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';

/**
 * Standard page size (default: 50, max: 500, -1 for unlimited)
 */
export const PageSizeStandardSchema = z
  .number()
  .int('Page size must be an integer')
  .min(-1, 'Page size must be -1 (unlimited) or a positive integer')
  .max(500, 'Page size cannot exceed 500')
  .optional()
  .describe('Number of results to return. Default: 50. Set to -1 for all results (max 500).');

/**
 * Limited page size (default: 25, max: 100, -1 for up to 100)
 */
export const PageSizeLimitedSchema = z
  .number()
  .int()
  .min(-1)
  .max(100, 'API limited to maximum 100 results')
  .optional()
  .describe('Number of results to return. Default: 25. Max: 100.');

/**
 * Medium page size (default: 25, max: 500)
 */
export const PageSizeMediumSchema = z
  .number()
  .int()
  .min(-1)
  .max(500)
  .optional()
  .describe('Number of results to return. Default: 25. Max: 500.');

/**
 * Attachment page size (default: 10, max: 50, no unlimited)
 */
export const PageSizeAttachmentsSchema = z
  .number()
  .int()
  .min(1, 'Page size must be at least 1 for attachments')
  .max(50, 'Page size cannot exceed 50 for attachments')
  .optional()
  .describe('Number of results. Default: 10. Max: 50. Attachments are large binary objects.');

/**
 * Email address validation
 */
export const EmailSchema = z.string().email('Invalid email format. Example: user@example.com').toLowerCase().trim();

/**
 * Phone number validation (international format)
 */
export const PhoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-()]+$/, 'Phone must contain only digits, spaces, hyphens, and parentheses')
  .trim();

/**
 * Date string in YYYY-MM-DD format
 */
export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((val) => !isNaN(Date.parse(val)), 'Date must be a valid date');

/**
 * ISO 8601 date-time string
 */
export const ISODateTimeSchema = z
  .string()
  .datetime({ message: 'Must be ISO 8601 format (e.g., 2025-09-17T16:30:00Z)' });

/**
 * Positive integer ID
 */
export const PositiveIdSchema = z.number().int('ID must be an integer').positive('ID must be a positive integer');

/**
 * Search term string
 */
export const SearchTermSchema = z.string().min(1, 'Search term cannot be empty').trim().optional();

/**
 * Response format enum (FR-003)
 */
export const ResponseFormatSchema = z
  .enum(['json', 'markdown'])
  .optional()
  .default('json')
  .describe("Response format: 'json' (default) or 'markdown'");

/**
 * Boolean filter (optional)
 */
export const BooleanFilterSchema = z.boolean().optional();

/**
 * String field with max length
 */
export function createStringSchema(
  maxLength: number,
  fieldName: string,
  required: boolean = true,
): z.ZodString | z.ZodOptional<z.ZodString> {
  const base = z
    .string()
    .min(1, `${fieldName} cannot be empty`)
    .max(maxLength, `${fieldName} cannot exceed ${maxLength} characters`)
    .trim();

  return required ? base : base.optional();
}

/**
 * Export all common schemas as a const object for convenience
 */
export const CommonSchemas = {
  PageSizeStandard: PageSizeStandardSchema,
  PageSizeLimited: PageSizeLimitedSchema,
  PageSizeMedium: PageSizeMediumSchema,
  PageSizeAttachments: PageSizeAttachmentsSchema,
  Email: EmailSchema,
  Phone: PhoneSchema,
  DateString: DateStringSchema,
  ISODateTime: ISODateTimeSchema,
  PositiveId: PositiveIdSchema,
  SearchTerm: SearchTermSchema,
  ResponseFormat: ResponseFormatSchema,
  BooleanFilter: BooleanFilterSchema,
} as const;
