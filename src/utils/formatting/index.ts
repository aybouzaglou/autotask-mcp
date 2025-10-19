/**
 * Formatting Utilities Index
 *
 * Central export point for all formatting utilities and helpers.
 *
 * @see specs/004-mcp-best-practices-review/spec.md FR-003, FR-009
 */

// Export truncation utilities
export { enforceCharacterLimit, CHARACTER_LIMIT } from './truncation.js';

// Export base formatter
export { BaseFormatter } from './base.formatter.js';

/**
 * Format data as pretty-printed JSON
 *
 * Converts data to a formatted JSON string with proper indentation.
 * This is the default response format for all tools.
 *
 * @param data - Data to format
 * @param indent - Number of spaces for indentation (default: 2)
 * @returns Pretty-printed JSON string
 *
 * @example
 * ```typescript
 * const result = { id: 123, name: "Acme Corp", isActive: true };
 * const formatted = formatAsJSON(result);
 * // Returns:
 * // {
 * //   "id": 123,
 * //   "name": "Acme Corp",
 * //   "isActive": true
 * // }
 * ```
 */
export function formatAsJSON(data: unknown, indent: number = 2): string {
  try {
    return JSON.stringify(data, null, indent);
  } catch (error) {
    // Fallback for non-serializable data
    return JSON.stringify(
      {
        error: 'Failed to serialize data',
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      indent,
    );
  }
}

/**
 * Format data as Markdown using entity-specific formatters
 *
 * This is a placeholder that will route to entity-specific formatters
 * once they are implemented. For now, it returns a formatted JSON
 * representation wrapped in a code block.
 *
 * @param data - Data to format
 * @param _entityType - The type of entity being formatted (e.g., "company", "ticket")
 * @returns Markdown-formatted string
 *
 * @example
 * ```typescript
 * const companies = [{ id: 123, companyName: "Acme Corp" }];
 * const formatted = formatAsMarkdown(companies, "company");
 * // Will use CompanyFormatter when available, falls back to JSON
 * ```
 *
 * @todo Implement entity-specific formatter routing in Phase 6 (User Story 3)
 */
export function formatAsMarkdown(data: unknown, _entityType?: string): string {
  // TODO: Phase 6 (US3) - Route to entity-specific formatters
  // For now, return JSON in a code block as a fallback
  return `\`\`\`json\n${formatAsJSON(data)}\n\`\`\`\n`;
}

/**
 * Determine if a response should be formatted as Markdown
 *
 * Checks the response_format parameter from validated input.
 *
 * @param responseFormat - The validated response format value
 * @returns True if Markdown format is requested
 *
 * @example
 * ```typescript
 * const validatedInput = validateInput(schema, params, toolName);
 * if (validatedInput.success) {
 *   const useMarkdown = shouldFormatAsMarkdown(validatedInput.data.response_format);
 *   const output = useMarkdown
 *     ? formatAsMarkdown(results, "company")
 *     : formatAsJSON(results);
 * }
 * ```
 */
export function shouldFormatAsMarkdown(responseFormat: 'json' | 'markdown' | undefined): boolean {
  return responseFormat === 'markdown';
}
