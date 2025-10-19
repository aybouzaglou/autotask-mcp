/**
 * Character Limit Enforcement Utility
 *
 * Enforces the 25,000 character response limit to prevent overwhelming
 * LLM context windows, with actionable guidance for users.
 *
 * @see specs/004-mcp-best-practices-review/spec.md FR-009
 */

/**
 * Maximum character limit for all tool responses
 *
 * This limit ensures responses don't overwhelm LLM context windows
 * and remain manageable for processing.
 */
export const CHARACTER_LIMIT = 25000;

/**
 * Enforce character limit on tool responses with truncation guidance
 *
 * Truncates responses that exceed 25,000 characters and appends a helpful
 * guidance message explaining how users can reduce the response size.
 *
 * @param content - The response content to check/truncate
 * @param toolName - The name of the tool (for context-specific guidance)
 * @returns Truncated content with guidance if limit was exceeded
 *
 * @example
 * ```typescript
 * const response = JSON.stringify(largeResultSet);
 * const limited = enforceCharacterLimit(response, "autotask_search_companies");
 * // If response > 25000 chars, returns truncated content with guidance message
 * ```
 */
export function enforceCharacterLimit(content: string, toolName: string): string {
  if (content.length <= CHARACTER_LIMIT) {
    return content;
  }

  // Truncate at the character limit
  const truncated = content.substring(0, CHARACTER_LIMIT);

  // Generate context-specific guidance
  const guidance = getGuidanceForTool(toolName);

  // Append truncation notice with guidance
  const notice = `

[RESPONSE TRUNCATED]

This response exceeded the ${CHARACTER_LIMIT.toLocaleString()} character limit and was truncated.

${guidance}

Original size: ${content.length.toLocaleString()} characters
Displayed: ${CHARACTER_LIMIT.toLocaleString()} characters
`;

  return truncated + notice;
}

/**
 * Get context-specific guidance for reducing response size
 *
 * Provides tool-specific suggestions for how users can reduce the
 * response size by adjusting parameters.
 *
 * @param toolName - The name of the tool
 * @returns Context-specific guidance message
 *
 * @internal
 */
function getGuidanceForTool(toolName: string): string {
  // Search/list tools
  if (toolName.includes('search') || toolName.includes('list')) {
    return `To reduce response size:
- Decrease the 'pageSize' parameter (e.g., pageSize: 25 instead of 50)
- Add more specific filters to narrow results
- Use 'response_format: "markdown"' for more compact output
- Request only essential fields if the API supports field selection`;
  }

  // Get/details tools
  if (toolName.includes('get_') || toolName.includes('details')) {
    return `To reduce response size:
- Request specific sections instead of the full entity
- Use 'response_format: "markdown"' for more compact output
- Exclude large embedded objects if not needed`;
  }

  // Attachment tools
  if (toolName.includes('attachment')) {
    return `To reduce response size:
- Decrease the 'pageSize' parameter (attachments are large objects)
- Request attachments individually rather than in bulk
- Consider fetching only attachment metadata without content`;
  }

  // Generic guidance for other tools
  return `To reduce response size:
- Decrease the 'pageSize' parameter if applicable
- Add more specific filters to narrow results
- Use 'response_format: "markdown"' for more compact output`;
}
