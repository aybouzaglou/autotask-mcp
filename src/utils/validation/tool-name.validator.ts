// Tool Name Validator
// Validates that tool names follow the autotask_ naming convention

const AUTOTASK_PREFIX = 'autotask_';
const VALID_TOOL_NAME_PATTERN = /^autotask_[a-z_]+$/;

/**
 * Validates that a tool name follows the autotask_ prefix convention
 *
 * @param toolName - The tool name to validate
 * @returns true if the tool name is valid, false otherwise
 *
 * @example
 * isValidAutotaskToolName('autotask_search_companies') // true
 * isValidAutotaskToolName('search_companies') // false
 * isValidAutotaskToolName('autotask_Search_Companies') // false (uppercase not allowed)
 */
export function isValidAutotaskToolName(toolName: string): boolean {
  if (typeof toolName !== 'string' || toolName.length === 0) {
    return false;
  }

  // Must start with autotask_ prefix
  if (!toolName.startsWith(AUTOTASK_PREFIX)) {
    return false;
  }

  // Must match the valid pattern (lowercase letters and underscores only)
  if (!VALID_TOOL_NAME_PATTERN.test(toolName)) {
    return false;
  }

  // Must have content after the prefix
  const nameAfterPrefix = toolName.substring(AUTOTASK_PREFIX.length);
  if (nameAfterPrefix.length === 0) {
    return false;
  }

  return true;
}

/**
 * Validates all tool names in a list
 *
 * @param toolNames - Array of tool names to validate
 * @returns Object with validation results
 *
 * @example
 * validateAllToolNames(['autotask_search_companies', 'invalid_tool'])
 * // Returns: { valid: ['autotask_search_companies'], invalid: ['invalid_tool'], allValid: false }
 */
export function validateAllToolNames(toolNames: string[]): {
  valid: string[];
  invalid: string[];
  allValid: boolean;
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const toolName of toolNames) {
    if (isValidAutotaskToolName(toolName)) {
      valid.push(toolName);
    } else {
      invalid.push(toolName);
    }
  }

  return {
    valid,
    invalid,
    allValid: invalid.length === 0,
  };
}

/**
 * Gets the tool name without the autotask_ prefix
 *
 * @param toolName - The full tool name with prefix
 * @returns The tool name without prefix, or null if invalid
 *
 * @example
 * getToolNameWithoutPrefix('autotask_search_companies') // 'search_companies'
 * getToolNameWithoutPrefix('invalid_tool') // null
 */
export function getToolNameWithoutPrefix(toolName: string): string | null {
  if (!isValidAutotaskToolName(toolName)) {
    return null;
  }

  return toolName.substring(AUTOTASK_PREFIX.length);
}

/**
 * Adds the autotask_ prefix to a tool name if it doesn't already have it
 *
 * @param toolName - The tool name (with or without prefix)
 * @returns The tool name with prefix
 *
 * @example
 * addAutotaskPrefix('search_companies') // 'autotask_search_companies'
 * addAutotaskPrefix('autotask_search_companies') // 'autotask_search_companies'
 */
export function addAutotaskPrefix(toolName: string): string {
  if (toolName.startsWith(AUTOTASK_PREFIX)) {
    return toolName;
  }

  return `${AUTOTASK_PREFIX}${toolName}`;
}
