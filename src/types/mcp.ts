// MCP Protocol Type Definitions
// Based on Model Context Protocol specification

export interface McpServerConfig {
  name: string;
  version: string;
  autotask: {
    username?: string;
    integrationCode?: string;
    secret?: string;
    apiUrl?: string;
  };
}

// MCP Resource types
export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// MCP Tool types

/**
 * Tool Annotations Interface
 *
 * Provides behavioral hints to MCP clients about how tools should be executed.
 * All properties are optional and provide hints only - they do not enforce
 * security constraints.
 *
 * @see specs/004-mcp-best-practices-review/contracts/tool-annotations.contract.ts
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

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  /**
   * Behavioral annotations for MCP clients
   *
   * Optional but highly recommended for proper client behavior
   */
  annotations?: ToolAnnotations;
}

export interface McpToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface McpToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: any;
  }>;
  isError?: boolean;
}

// Autotask-specific MCP Resource URIs
export const AUTOTASK_RESOURCE_URIS = {
  COMPANIES: 'autotask://companies',
  COMPANY: 'autotask://companies/{id}',
  TICKETS: 'autotask://tickets',
  TICKET: 'autotask://tickets/{id}',
  CONTACTS: 'autotask://contacts',
  CONTACT: 'autotask://contacts/{id}',
  COMPANY_CONTACTS: 'autotask://companies/{companyId}/contacts',
  COMPANY_TICKETS: 'autotask://companies/{companyId}/tickets',
} as const;

// Autotask-specific MCP Tool names
export const AUTOTASK_TOOLS = {
  // Company tools
  GET_COMPANY: 'autotask_get_company',
  SEARCH_COMPANIES: 'autotask_search_companies',
  CREATE_COMPANY: 'autotask_create_company',
  UPDATE_COMPANY: 'autotask_update_company',

  // Ticket tools
  GET_TICKET: 'autotask_get_ticket',
  SEARCH_TICKETS: 'autotask_search_tickets',
  CREATE_TICKET: 'autotask_create_ticket',
  UPDATE_TICKET: 'autotask_update_ticket',
  ADD_TICKET_NOTE: 'autotask_add_ticket_note',

  // Contact tools
  GET_CONTACT: 'autotask_get_contact',
  SEARCH_CONTACTS: 'autotask_search_contacts',
  CREATE_CONTACT: 'autotask_create_contact',
  UPDATE_CONTACT: 'autotask_update_contact',

  // Time entry tools
  CREATE_TIME_ENTRY: 'autotask_create_time_entry',
  GET_TIME_ENTRIES: 'autotask_get_time_entries',
} as const;

// Common parameter schemas for tools
export const COMMON_SCHEMAS = {
  ID_PARAMETER: {
    type: 'integer',
    description: 'The ID of the entity',
    minimum: 1,
  },
  COMPANY_ID_PARAMETER: {
    type: 'integer',
    description: 'The company ID',
    minimum: 1,
  },
  SEARCH_QUERY: {
    type: 'string',
    description: 'Search query string',
    minLength: 1,
  },
  LIMIT_PARAMETER: {
    type: 'integer',
    description: 'Maximum number of results to return',
    minimum: 1,
    maximum: 500,
    default: 50,
  },
} as const;
