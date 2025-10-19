/**
 * MCP Tool Annotations Contract
 *
 * Defines the contract for MCP tool behavioral annotations according to
 * MCP specification version 2025-06-18.
 *
 * Reference: https://github.com/modelcontextprotocol/specification
 */

/**
 * Tool Annotations Interface
 *
 * Provides behavioral hints to MCP clients about how tools should be executed.
 * All properties are optional and provide hints only - they do not enforce
 * security constraints.
 */
export interface ToolAnnotations {
  /**
   * Human-readable title for the tool
   *
   * @example "Search Companies"
   * @maxLength 50
   */
  title?: string;

  /**
   * Indicates whether the tool only reads data without making modifications.
   *
   * @default false
   *
   * When true:
   * - Tool only queries/retrieves data
   * - No side effects or modifications
   * - Can be executed without user confirmation
   * - Examples: search, get, list, test_connection
   *
   * When false:
   * - Tool performs write operations
   * - May have side effects
   * - destructiveHint and idempotentHint become relevant
   */
  readOnlyHint?: boolean;

  /**
   * Indicates whether the tool performs irreversible operations.
   *
   * @default true
   *
   * Only meaningful when readOnlyHint is false.
   *
   * When true:
   * - Tool performs permanent deletions
   * - Operations cannot be easily reversed
   * - May trigger additional confirmation prompts
   * - Examples: delete operations, final approvals
   *
   * When false:
   * - Tool performs reversible operations
   * - Changes can be corrected or undone
   * - Examples: create (can be deleted), update (can be re-updated)
   */
  destructiveHint?: boolean;

  /**
   * Indicates whether repeated calls with identical arguments produce
   * no additional environmental effects beyond the first call.
   *
   * @default false
   *
   * Only meaningful when readOnlyHint is false.
   *
   * When true:
   * - Calling twice with same args = calling once
   * - Safe to retry on errors without duplicating effects
   * - Examples: setting a value, deletion
   *
   * When false:
   * - Each call produces new side effects
   * - Retrying may create duplicate data
   * - Examples: creating entities with auto-generated IDs, appending to logs
   */
  idempotentHint?: boolean;

  /**
   * Indicates whether the tool may interact with external entities beyond
   * the LLM's knowledge.
   *
   * @default true
   *
   * When true:
   * - Tool interacts with external systems (APIs, databases, file systems)
   * - Tool's behavior depends on external state unknown to the LLM
   * - Examples: API calls, web searches, file operations
   *
   * When false:
   * - Tool operates within a closed, deterministic domain
   * - Tool's behavior is fully predictable by the LLM
   * - Examples: pure calculations, string formatting, local cache reads
   */
  openWorldHint?: boolean;
}

/**
 * Extended MCP Tool Definition
 *
 * Extends the base MCP tool definition with annotation support.
 */
export interface McpTool {
  /**
   * Unique tool identifier
   *
   * MUST start with "autotask_" prefix for multi-server compatibility
   *
   * @pattern ^autotask_[a-z_]+$
   * @example "autotask_search_companies"
   */
  name: string;

  /**
   * Human-readable tool description
   *
   * Should describe:
   * - What the tool does
   * - When to use it
   * - Any important constraints or defaults
   *
   * @minLength 10
   * @maxLength 500
   */
  description: string;

  /**
   * JSON Schema v7 definition for tool parameters
   *
   * Generated from Zod schemas using zod-to-json-schema
   */
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: false; // Enforced by Zod .strict()
  };

  /**
   * Behavioral annotations for MCP clients
   *
   * Optional but highly recommended for proper client behavior
   */
  annotations?: ToolAnnotations;
}

/**
 * Tool Classification Matrix
 *
 * Standard annotation patterns for different tool categories in the
 * Autotask MCP server.
 */
export const TOOL_ANNOTATION_PATTERNS = {
  /**
   * Search/List Tools
   *
   * Tools that query for multiple entities
   * Examples: search_companies, search_tickets, search_contacts
   */
  SEARCH_LIST: {
    readOnlyHint: true,
    destructiveHint: false, // Ignored when readOnlyHint is true
    idempotentHint: false,  // Ignored when readOnlyHint is true
    openWorldHint: true,    // Queries external Autotask API
  } as const,

  /**
   * Get/Read Tools
   *
   * Tools that retrieve a single entity by ID
   * Examples: get_ticket_details, get_ticket_note, get_quote
   */
  GET_READ: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  } as const,

  /**
   * Create Tools
   *
   * Tools that create new entities
   * Examples: create_ticket, create_company, create_contact
   */
  CREATE: {
    readOnlyHint: false,
    destructiveHint: false,  // Can be deleted later, not irreversible
    idempotentHint: false,   // Each call creates a new entity
    openWorldHint: true,     // Creates in external Autotask system
  } as const,

  /**
   * Update Tools
   *
   * Tools that modify existing entities
   * Examples: update_ticket, update_company
   */
  UPDATE: {
    readOnlyHint: false,
    destructiveHint: false,  // Can be re-updated, not permanently destructive
    idempotentHint: false,   // Conservative: assume state changes matter
    openWorldHint: true,     // Updates in external Autotask system
  } as const,

  /**
   * Test/Health Check Tools
   *
   * Tools that verify system connectivity
   * Examples: test_connection
   */
  TEST: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,     // Tests external API connectivity
  } as const,

  /**
   * Cache Management Tools (if applicable)
   *
   * Tools that manage local cache
   * Examples: clear_cache, get_cache_stats
   */
  CACHE: {
    readOnlyHint: false,     // Varies by operation
    destructiveHint: false,  // Cache can be rebuilt
    idempotentHint: true,    // Clearing twice = clearing once
    openWorldHint: false,    // Local operation, no external API
  } as const,
} as const;

/**
 * Type guard to validate tool name follows naming convention
 */
export function isValidAutotaskToolName(name: string): boolean {
  return /^autotask_[a-z_]+$/.test(name);
}

/**
 * Validate tool annotations are consistent
 *
 * @throws Error if annotations are inconsistent
 */
export function validateAnnotations(annotations: ToolAnnotations): void {
  // If readOnlyHint is true, destructiveHint and idempotentHint should be ignored
  if (annotations.readOnlyHint === true) {
    // No further validation needed for read-only tools
    return;
  }

  // For write operations, all hints should be explicitly set
  if (annotations.readOnlyHint === false) {
    if (annotations.destructiveHint === undefined) {
      console.warn(
        "destructiveHint should be explicitly set for write operations"
      );
    }
    if (annotations.idempotentHint === undefined) {
      console.warn(
        "idempotentHint should be explicitly set for write operations"
      );
    }
  }

  // openWorldHint should always be explicitly set
  if (annotations.openWorldHint === undefined) {
    console.warn("openWorldHint should be explicitly set for all tools");
  }
}
