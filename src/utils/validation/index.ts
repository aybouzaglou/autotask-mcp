/**
 * Validation Utilities Index
 *
 * Central export point for all validation utilities, schemas, and helpers.
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import { formatZodError, type ValidationResult } from './error-formatter.js';

// Export common schemas
export { CommonSchemas } from './common.schemas.js';
export {
  PageSizeStandardSchema,
  PageSizeLimitedSchema,
  PageSizeMediumSchema,
  PageSizeAttachmentsSchema,
  EmailSchema,
  PhoneSchema,
  DateStringSchema,
  ISODateTimeSchema,
  PositiveIdSchema,
  SearchTermSchema,
  ResponseFormatSchema,
  BooleanFilterSchema,
  createStringSchema,
} from './common.schemas.js';

// Export error formatter
export { formatZodError, deriveGuidance, type ValidationError, type ValidationResult } from './error-formatter.js';

/**
 * Validate input using a Zod schema and return structured result
 *
 * This is the main validation entry point for all tool parameter validation.
 * It wraps Zod's safeParse with structured error formatting per FR-007.
 *
 * @param schema - The Zod schema to validate against
 * @param input - The input data to validate
 * @param toolName - The name of the tool being validated (for error context)
 * @returns Structured validation result with data or error
 *
 * @example
 * ```typescript
 * import { validateInput } from './utils/validation';
 * import { CompanySearchInputSchema } from './utils/validation/company.schemas';
 *
 * const result = validateInput(
 *   CompanySearchInputSchema,
 *   params,
 *   "autotask_search_companies"
 * );
 *
 * if (!result.success) {
 *   return {
 *     content: [{ type: "text", text: JSON.stringify(result.error, null, 2) }],
 *     isError: true
 *   };
 * }
 *
 * const validatedParams = result.data;
 * // ... proceed with API call
 * ```
 */
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown, toolName: string): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: formatZodError(result.error, toolName),
  };
}
