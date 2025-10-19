/**
 * Validation Error Formatter
 *
 * Formats Zod validation errors into structured, user-friendly error responses
 * with actionable guidance per FR-007.
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { ZodError, ZodIssue } from 'zod';
import { randomUUID } from 'crypto';

/**
 * Structured validation error (FR-007)
 */
export interface ValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  details: string[];
  guidance: string;
  correlationId: string;
}

/**
 * Base validation result interface
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ValidationError;
}

/**
 * Format Zod validation errors into structured error response (FR-007)
 *
 * Converts Zod error messages into clear, actionable feedback for LLMs.
 * Each error detail includes the field name, error message, and received value
 * for invalid_type errors.
 *
 * @param error - The Zod validation error to format
 * @param toolName - The name of the tool being validated (for context)
 * @returns Structured validation error with details and guidance
 *
 * @example
 * ```typescript
 * const result = schema.safeParse(input);
 * if (!result.success) {
 *   const error = formatZodError(result.error, "autotask_search_companies");
 *   // Returns:
 *   // {
 *   //   code: "VALIDATION_ERROR",
 *   //   message: "Invalid parameters for autotask_search_companies",
 *   //   details: ["Field 'pageSize': Page size cannot exceed 500 (received: 1000)"],
 *   //   guidance: "Check parameter constraints (min/max values, string lengths, array sizes).",
 *   //   correlationId: "550e8400-e29b-41d4-a716-446655440000"
 *   // }
 * }
 * ```
 */
export function formatZodError(error: ZodError, toolName: string): ValidationError {
  const details = error.errors.map((err) => {
    const field = err.path.length > 0 ? err.path.join('.') : 'root';
    const value = err.code === 'invalid_type' ? `(received: ${err.received})` : '';

    return `Field '${field}': ${err.message} ${value}`.trim();
  });

  const guidance = deriveGuidance(error.errors);

  return {
    code: 'VALIDATION_ERROR',
    message: `Invalid parameters for ${toolName}`,
    details,
    guidance,
    correlationId: randomUUID(),
  };
}

/**
 * Derive actionable guidance from Zod error codes
 *
 * Analyzes the types of validation errors present and provides specific,
 * actionable guidance to help users fix the issues.
 *
 * @param errors - Array of Zod issues to analyze
 * @returns Actionable guidance message
 *
 * @internal
 */
export function deriveGuidance(errors: ZodIssue[]): string {
  const errorTypes = new Set(errors.map((e) => e.code));

  if (errorTypes.has('unrecognized_keys')) {
    return 'Remove unexpected parameters. Only parameters defined in the tool schema are allowed.';
  }

  if (errorTypes.has('invalid_type')) {
    return 'Check parameter types. Ensure strings, numbers, and booleans match expected types.';
  }

  if (errorTypes.has('too_small') || errorTypes.has('too_big')) {
    return 'Check parameter constraints (min/max values, string lengths, array sizes).';
  }

  if (errorTypes.has('invalid_string')) {
    return 'Check string format requirements (email, URL, date format, regex patterns).';
  }

  if (errorTypes.has('custom')) {
    return 'Check business logic constraints. Some fields have interdependencies.';
  }

  return 'Review the parameter requirements and ensure all values meet the specified constraints.';
}
