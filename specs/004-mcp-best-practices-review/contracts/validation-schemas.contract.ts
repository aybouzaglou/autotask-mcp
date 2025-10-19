/**
 * Validation Schemas Contract
 *
 * Defines the contract for Zod-based runtime validation of tool parameters.
 *
 * All schemas use .strict() mode to reject unexpected properties and provide
 * clear, actionable error messages per FR-007.
 */

import { z, ZodError, ZodIssue } from "zod";

/**
 * Base validation result interface
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ValidationError;
}

/**
 * Structured validation error (FR-007)
 */
export interface ValidationError {
  code: "VALIDATION_ERROR";
  message: string;
  details: string[];
  guidance: string;
  correlationId: string;
}

/**
 * Reusable field schemas for common parameter types
 */
export const CommonSchemas = {
  /**
   * Standard page size (default: 50, max: 500, -1 for unlimited)
   */
  PageSizeStandard: z
    .number()
    .int("Page size must be an integer")
    .min(-1, "Page size must be -1 (unlimited) or a positive integer")
    .max(500, "Page size cannot exceed 500")
    .optional()
    .describe(
      "Number of results to return. Default: 50. Set to -1 for all results (max 500)."
    ),

  /**
   * Limited page size (default: 25, max: 100, -1 for up to 100)
   */
  PageSizeLimited: z
    .number()
    .int()
    .min(-1)
    .max(100, "API limited to maximum 100 results")
    .optional()
    .describe("Number of results to return. Default: 25. Max: 100."),

  /**
   * Medium page size (default: 25, max: 500)
   */
  PageSizeMedium: z
    .number()
    .int()
    .min(-1)
    .max(500)
    .optional()
    .describe("Number of results to return. Default: 25. Max: 500."),

  /**
   * Attachment page size (default: 10, max: 50, no unlimited)
   */
  PageSizeAttachments: z
    .number()
    .int()
    .min(1, "Page size must be at least 1 for attachments")
    .max(50, "Page size cannot exceed 50 for attachments")
    .optional()
    .describe(
      "Number of results. Default: 10. Max: 50. Attachments are large binary objects."
    ),

  /**
   * Email address validation
   */
  Email: z
    .string()
    .email("Invalid email format. Example: user@example.com")
    .toLowerCase()
    .trim(),

  /**
   * Phone number validation (international format)
   */
  Phone: z
    .string()
    .regex(
      /^\+?[\d\s\-\(\)]+$/,
      "Phone must contain only digits, spaces, hyphens, and parentheses"
    )
    .trim(),

  /**
   * Date string in YYYY-MM-DD format
   */
  DateString: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((val) => !isNaN(Date.parse(val)), "Date must be a valid date"),

  /**
   * ISO 8601 date-time string
   */
  ISODateTime: z
    .string()
    .datetime({ message: "Must be ISO 8601 format (e.g., 2025-09-17T16:30:00Z)" }),

  /**
   * Positive integer ID
   */
  PositiveId: z
    .number()
    .int("ID must be an integer")
    .positive("ID must be a positive integer"),

  /**
   * Search term string
   */
  SearchTerm: z
    .string()
    .min(1, "Search term cannot be empty")
    .trim()
    .optional(),

  /**
   * Response format enum (FR-003)
   */
  ResponseFormat: z
    .enum(["json", "markdown"])
    .optional()
    .default("json")
    .describe("Response format: 'json' (default) or 'markdown'"),
} as const;

/**
 * Example tool input schema with strict mode
 *
 * This demonstrates the standard pattern for all tool schemas:
 * 1. Use common schemas for standard fields
 * 2. Add tool-specific validation rules
 * 3. Enable .strict() mode to reject unexpected properties
 * 4. Use .describe() for clear parameter documentation
 */
export const ExampleSearchSchema = z
  .object({
    searchTerm: CommonSchemas.SearchTerm,
    companyID: CommonSchemas.PositiveId.optional(),
    isActive: z.boolean().optional().describe("Filter by active status"),
    pageSize: CommonSchemas.PageSizeStandard,
    response_format: CommonSchemas.ResponseFormat,
  })
  .strict(); // Reject unexpected properties (FR-006)

export type ExampleSearchInput = z.infer<typeof ExampleSearchSchema>;

/**
 * Example create schema with complex validation
 */
export const ExampleCreateSchema = z
  .object({
    companyID: CommonSchemas.PositiveId.describe("Company ID for the entity"),

    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name cannot exceed 50 characters")
      .trim(),

    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name cannot exceed 50 characters")
      .trim(),

    emailAddress: CommonSchemas.Email.optional(),

    phone: CommonSchemas.Phone.optional(),

    title: z
      .string()
      .max(100, "Job title cannot exceed 100 characters")
      .trim()
      .optional(),
  })
  .strict();

export type ExampleCreateInput = z.infer<typeof ExampleCreateSchema>;

/**
 * Example update schema with at-least-one validation
 */
export const ExampleUpdateSchema = z
  .object({
    id: CommonSchemas.PositiveId,

    status: z.number().int().min(1).optional(),

    priority: z.number().int().min(1).optional(),

    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(255, "Title cannot exceed 255 characters")
      .trim()
      .optional(),

    description: z
      .string()
      .min(1, "Description cannot be empty")
      .max(8000, "Description cannot exceed 8000 characters")
      .trim()
      .optional(),

    dueDateTime: CommonSchemas.ISODateTime.optional(),
  })
  .strict()
  .refine(
    (data) => {
      // At least one update field must be provided
      const { id, ...updates } = data;
      return Object.keys(updates).length > 0;
    },
    {
      message:
        "At least one field (status, priority, title, description, etc.) must be provided for update",
    }
  );

export type ExampleUpdateInput = z.infer<typeof ExampleUpdateSchema>;

/**
 * Format Zod validation errors into structured error response (FR-007)
 */
export function formatZodError(
  error: ZodError,
  toolName: string
): ValidationError {
  const details = error.errors.map((err) => {
    const field = err.path.length > 0 ? err.path.join(".") : "root";
    const value =
      err.code === "invalid_type" ? `(received: ${err.received})` : "";

    return `Field '${field}': ${err.message} ${value}`.trim();
  });

  const guidance = deriveGuidance(error.errors);

  return {
    code: "VALIDATION_ERROR",
    message: `Invalid parameters for ${toolName}`,
    details,
    guidance,
    correlationId: crypto.randomUUID(),
  };
}

/**
 * Derive actionable guidance from Zod error codes
 */
function deriveGuidance(errors: ZodIssue[]): string {
  const errorTypes = new Set(errors.map((e) => e.code));

  if (errorTypes.has("unrecognized_keys")) {
    return "Remove unexpected parameters. Only parameters defined in the tool schema are allowed.";
  }

  if (errorTypes.has("invalid_type")) {
    return "Check parameter types. Ensure strings, numbers, and booleans match expected types.";
  }

  if (errorTypes.has("too_small") || errorTypes.has("too_big")) {
    return "Check parameter constraints (min/max values, string lengths, array sizes).";
  }

  if (errorTypes.has("invalid_string")) {
    return "Check string format requirements (email, URL, date format, regex patterns).";
  }

  if (errorTypes.has("custom")) {
    return "Check business logic constraints. Some fields have interdependencies.";
  }

  return "Review the parameter requirements and ensure all values meet the specified constraints.";
}

/**
 * Validate input using a Zod schema and return structured result
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  toolName: string
): ValidationResult<T> {
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

/**
 * Schema organization structure
 *
 * Recommended file structure for schema registry:
 *
 * src/utils/validation/
 * ├── index.ts              # Export all schemas
 * ├── common.schemas.ts     # CommonSchemas (reusable fields)
 * ├── company.schemas.ts    # Company tool schemas
 * ├── contact.schemas.ts    # Contact tool schemas
 * ├── ticket.schemas.ts     # Ticket tool schemas
 * ├── project.schemas.ts    # Project tool schemas
 * ├── time.schemas.ts       # Time entry tool schemas
 * └── resource.schemas.ts   # Resource tool schemas
 */

/**
 * Schema naming convention
 *
 * All schemas should follow this naming pattern:
 * - Search tools: {Entity}SearchInputSchema
 * - Create tools: {Entity}CreateInputSchema
 * - Update tools: {Entity}UpdateInputSchema
 * - Get tools: {Entity}GetInputSchema
 *
 * Examples:
 * - CompanySearchInputSchema
 * - TicketCreateInputSchema
 * - ContactUpdateInputSchema
 */

/**
 * Type inference convention
 *
 * Always derive TypeScript types from Zod schemas using z.infer:
 *
 * export const MySchema = z.object({...}).strict();
 * export type MyInput = z.infer<typeof MySchema>;
 *
 * NEVER manually define types separately from schemas.
 */
