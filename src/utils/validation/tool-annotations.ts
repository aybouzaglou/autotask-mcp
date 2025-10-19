// Tool Annotations
// Constants and validation for MCP tool annotations

import { ToolAnnotations } from '../../types/mcp.js';

/**
 * Annotation constants for different tool categories
 *
 * Based on MCP best practices and research findings in:
 * specs/004-mcp-best-practices-review/research.md
 * specs/004-mcp-best-practices-review/contracts/tool-annotations.contract.ts
 */

/**
 * Annotations for read-only search/list tools
 *
 * Use for: search_*, list_*, get_*
 * Examples: autotask_search_companies, autotask_get_ticket_details
 */
export const READ_ONLY_ANNOTATIONS: Required<Omit<ToolAnnotations, 'title'>> = {
  readOnlyHint: true,
  destructiveHint: false, // N/A for read-only but set explicitly
  idempotentHint: false, // N/A for read-only but set explicitly
  openWorldHint: true,
};

/**
 * Annotations for create tools
 *
 * Use for: create_*
 * Examples: autotask_create_company, autotask_create_ticket
 *
 * - readOnlyHint: false (performs write operations)
 * - destructiveHint: false (can be reversed by deleting)
 * - idempotentHint: false (creates new entity each time)
 * - openWorldHint: true (interacts with Autotask API)
 */
export const CREATE_ANNOTATIONS: Required<Omit<ToolAnnotations, 'title'>> = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

/**
 * Annotations for update tools
 *
 * Use for: update_*
 * Examples: autotask_update_company, autotask_update_ticket
 *
 * - readOnlyHint: false (performs write operations)
 * - destructiveHint: false (can be corrected with another update)
 * - idempotentHint: false (updates are not inherently idempotent)
 * - openWorldHint: true (interacts with Autotask API)
 */
export const UPDATE_ANNOTATIONS: Required<Omit<ToolAnnotations, 'title'>> = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

/**
 * Annotations for test/connection tools
 *
 * Use for: test_*
 * Examples: autotask_test_connection
 */
export const TEST_ANNOTATIONS: Required<Omit<ToolAnnotations, 'title'>> = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

/**
 * Tool category classification
 */
export enum ToolCategory {
  SEARCH = 'search',
  GET = 'get',
  CREATE = 'create',
  UPDATE = 'update',
  TEST = 'test',
}

/**
 * Determines the tool category based on the tool name
 *
 * @param toolName - The full tool name (with autotask_ prefix)
 * @returns The tool category
 *
 * @example
 * getToolCategory('autotask_search_companies') // ToolCategory.SEARCH
 * getToolCategory('autotask_create_ticket') // ToolCategory.CREATE
 */
export function getToolCategory(toolName: string): ToolCategory {
  const nameWithoutPrefix = toolName.replace(/^autotask_/, '');

  if (nameWithoutPrefix.startsWith('search_')) {
    return ToolCategory.SEARCH;
  }

  if (nameWithoutPrefix.startsWith('get_')) {
    return ToolCategory.GET;
  }

  if (nameWithoutPrefix.startsWith('create_')) {
    return ToolCategory.CREATE;
  }

  if (nameWithoutPrefix.startsWith('update_')) {
    return ToolCategory.UPDATE;
  }

  if (nameWithoutPrefix.startsWith('test_')) {
    return ToolCategory.TEST;
  }

  // Default to read-only for unknown patterns
  return ToolCategory.GET;
}

/**
 * Get recommended annotations for a tool based on its category
 *
 * @param toolName - The full tool name (with autotask_ prefix)
 * @param title - Optional human-friendly title for the tool
 * @returns Recommended tool annotations
 *
 * @example
 * getRecommendedAnnotations('autotask_search_companies', 'Search Companies')
 * // Returns: { title: 'Search Companies', readOnlyHint: true, openWorldHint: true, ... }
 */
export function getRecommendedAnnotations(toolName: string, title?: string): ToolAnnotations {
  const category = getToolCategory(toolName);

  let baseAnnotations: Required<Omit<ToolAnnotations, 'title'>>;

  switch (category) {
    case ToolCategory.SEARCH:
    case ToolCategory.GET:
      baseAnnotations = READ_ONLY_ANNOTATIONS;
      break;

    case ToolCategory.CREATE:
      baseAnnotations = CREATE_ANNOTATIONS;
      break;

    case ToolCategory.UPDATE:
      baseAnnotations = UPDATE_ANNOTATIONS;
      break;

    case ToolCategory.TEST:
      baseAnnotations = TEST_ANNOTATIONS;
      break;

    default:
      baseAnnotations = READ_ONLY_ANNOTATIONS;
  }

  return {
    ...baseAnnotations,
    ...(title && { title }),
  };
}

/**
 * Validates tool annotations for consistency
 *
 * @param annotations - The tool annotations to validate
 * @returns Validation result with errors if any
 *
 * @example
 * validateAnnotations({ readOnlyHint: true, destructiveHint: true })
 * // Returns: { valid: false, errors: ['destructiveHint is only meaningful when readOnlyHint is false'] }
 */
export function validateAnnotations(annotations: ToolAnnotations): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // If readOnlyHint is true, destructiveHint and idempotentHint should not be true
  if (annotations.readOnlyHint === true) {
    if (annotations.destructiveHint === true) {
      errors.push('destructiveHint is only meaningful when readOnlyHint is false');
    }

    if (annotations.idempotentHint === true) {
      errors.push('idempotentHint is only meaningful when readOnlyHint is false');
    }
  }

  // Title should be reasonably short if provided
  if (annotations.title && annotations.title.length > 50) {
    errors.push('title should be 50 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates all tools have proper annotations
 *
 * @param tools - Array of tools with names and annotations
 * @returns Validation report
 *
 * @example
 * validateAllToolAnnotations([
 *   { name: 'autotask_search_companies', annotations: { readOnlyHint: true } },
 *   { name: 'autotask_create_ticket', annotations: { readOnlyHint: false } }
 * ])
 */
export function validateAllToolAnnotations(tools: Array<{ name: string; annotations?: ToolAnnotations }>): {
  valid: boolean;
  missingAnnotations: string[];
  invalidAnnotations: Array<{ toolName: string; errors: string[] }>;
} {
  const missingAnnotations: string[] = [];
  const invalidAnnotations: Array<{ toolName: string; errors: string[] }> = [];

  for (const tool of tools) {
    // Check if annotations are missing
    if (!tool.annotations) {
      missingAnnotations.push(tool.name);
      continue;
    }

    // Validate annotation consistency
    const validation = validateAnnotations(tool.annotations);
    if (!validation.valid) {
      invalidAnnotations.push({
        toolName: tool.name,
        errors: validation.errors,
      });
    }
  }

  return {
    valid: missingAnnotations.length === 0 && invalidAnnotations.length === 0,
    missingAnnotations,
    invalidAnnotations,
  };
}
