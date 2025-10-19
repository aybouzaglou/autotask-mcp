/**
 * Response Format Contract
 *
 * Defines the contract for dual response format support (JSON/Markdown)
 * per FR-003, FR-004, FR-005.
 */

/**
 * Supported response formats for search/list tools
 */
export type ResponseFormat = "json" | "markdown";

/**
 * Character limit for all responses (FR-008)
 */
export const CHARACTER_LIMIT = 25000;

/**
 * MCP Tool Result structure
 */
export interface McpToolResult {
  content: ContentBlock[];
  isError?: boolean;
}

/**
 * Content block for tool responses
 */
export interface ContentBlock {
  type: "text";
  text: string; // JSON or Markdown formatted
}

/**
 * Standard JSON response structure (FR-005)
 */
export interface JsonResponse<T = unknown> {
  message: string;
  data: T;
  timestamp: string; // ISO 8601 format
  count?: number; // For array responses
  truncated?: boolean; // If response was truncated
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  isError: true;
  error: {
    code: string;
    message: string;
    details?: string[];
    guidance?: string;
    correlationId: string;
  };
  tool?: string;
  timestamp: string;
}

/**
 * Markdown formatting options
 */
export interface MarkdownFormatOptions {
  /**
   * Include table headers
   * @default true
   */
  includeHeaders?: boolean;

  /**
   * Maximum number of rows to display
   * @default undefined (show all)
   */
  maxRows?: number;

  /**
   * Fields to include in output (undefined = all fields)
   */
  fields?: string[];

  /**
   * Show pagination guidance
   * @default true
   */
  showPaginationGuidance?: boolean;
}

/**
 * Format entities as Markdown table (FR-004)
 *
 * @example
 * ## Companies (3 results)
 *
 * | ID | Name | Status | Phone |
 * |-----|------|--------|-------|
 * | 123 | Acme Corp | Active | 555-0100 |
 * | 456 | Globex Inc | Active | 555-0200 |
 */
export interface MarkdownFormatter<T> {
  /**
   * Format entities as Markdown
   */
  format(entities: T[], options?: MarkdownFormatOptions): string;

  /**
   * Format a single entity as Markdown
   */
  formatSingle(entity: T): string;

  /**
   * Get human-readable field name
   */
  getFieldLabel(fieldName: keyof T): string;

  /**
   * Format field value for display
   */
  formatFieldValue(value: unknown, fieldName: keyof T): string;
}

/**
 * Truncation result (FR-009)
 */
export interface TruncationResult {
  content: string;
  wasTruncated: boolean;
  originalLength: number;
  truncatedLength: number;
  guidance?: string;
}

/**
 * Enforce character limit with guidance message (FR-008, FR-009, FR-010)
 */
export function enforceCharacterLimit(
  content: string,
  toolName: string,
  filters?: string[]
): TruncationResult {
  if (content.length <= CHARACTER_LIMIT) {
    return {
      content,
      wasTruncated: false,
      originalLength: content.length,
      truncatedLength: content.length,
    };
  }

  // Truncate at character limit
  const truncated = content.substring(0, CHARACTER_LIMIT);

  // Generate specific guidance (FR-010)
  const filterGuidance = filters?.length
    ? `Try using filters (${filters.join(", ")}) or reduce pageSize.`
    : "Try reducing pageSize or adding more specific filters.";

  const guidance = `\n\n[Response truncated at ${CHARACTER_LIMIT} characters. ${filterGuidance}]`;

  return {
    content: truncated + guidance,
    wasTruncated: true,
    originalLength: content.length,
    truncatedLength: CHARACTER_LIMIT + guidance.length,
    guidance,
  };
}

/**
 * Format timestamp for human readability (FR-004)
 */
export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return isoString; // Fallback to original if parsing fails
  }
}

/**
 * Format boolean as human-readable text (FR-004)
 */
export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return value ? "Yes" : "No";
}

/**
 * Format status value as human-readable text (FR-004)
 */
export function formatStatus(
  statusId: number | null | undefined,
  statusMap?: Map<number, string>
): string {
  if (statusId === null || statusId === undefined) return "N/A";
  return statusMap?.get(statusId) || `Status ${statusId}`;
}

/**
 * Base Markdown formatter implementation
 */
export abstract class BaseMarkdownFormatter<T> implements MarkdownFormatter<T> {
  constructor(
    protected entityName: string,
    protected fields: Array<keyof T>
  ) {}

  format(entities: T[], options?: MarkdownFormatOptions): string {
    if (entities.length === 0) {
      return `No ${this.entityName.toLowerCase()} found.`;
    }

    const selectedFields = options?.fields || this.fields;
    const maxRows = options?.maxRows || entities.length;
    const displayEntities = entities.slice(0, maxRows);

    let output = `## ${this.entityName} (${entities.length} result${entities.length === 1 ? "" : "s"})\n\n`;

    // Table header
    if (options?.includeHeaders !== false) {
      const headers = selectedFields.map((f) => this.getFieldLabel(f)).join(" | ");
      const separators = selectedFields.map(() => "-----").join("|");
      output += `| ${headers} |\n`;
      output += `|${separators}|\n`;
    }

    // Table rows
    for (const entity of displayEntities) {
      const values = selectedFields
        .map((field) => this.formatFieldValue(entity[field], field))
        .join(" | ");
      output += `| ${values} |\n`;
    }

    // Pagination guidance
    if (maxRows < entities.length && options?.showPaginationGuidance !== false) {
      output += `\n*Showing ${maxRows} of ${entities.length} results. Use pageSize parameter to see more.*\n`;
    }

    return output;
  }

  abstract formatSingle(entity: T): string;

  abstract getFieldLabel(fieldName: keyof T): string;

  formatFieldValue(value: unknown, _fieldName: keyof T): string {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return formatBoolean(value);
    if (typeof value === "string" && value.length > 50) {
      return value.substring(0, 47) + "...";
    }
    return String(value);
  }
}

/**
 * Example: Company Markdown Formatter
 */
export interface CompanyEntity {
  id: number;
  companyName: string;
  isActive: boolean;
  phone?: string;
  city?: string;
}

export class CompanyMarkdownFormatter extends BaseMarkdownFormatter<CompanyEntity> {
  constructor() {
    super("Companies", ["id", "companyName", "isActive", "phone", "city"]);
  }

  formatSingle(company: CompanyEntity): string {
    return `
## ${company.companyName}

**ID**: ${company.id}
**Status**: ${formatBoolean(company.isActive) === "Yes" ? "Active" : "Inactive"}
**Phone**: ${company.phone || "N/A"}
**City**: ${company.city || "N/A"}
    `.trim();
  }

  getFieldLabel(fieldName: keyof CompanyEntity): string {
    const labels: Record<keyof CompanyEntity, string> = {
      id: "ID",
      companyName: "Name",
      isActive: "Status",
      phone: "Phone",
      city: "City",
    };
    return labels[fieldName] || String(fieldName);
  }

  formatFieldValue(value: unknown, fieldName: keyof CompanyEntity): string {
    if (fieldName === "isActive") {
      return value ? "Active" : "Inactive";
    }
    return super.formatFieldValue(value, fieldName);
  }
}

/**
 * Response format factory
 *
 * Creates appropriate formatter based on response format parameter
 */
export function createResponseFormatter<T>(
  format: ResponseFormat,
  formatter?: MarkdownFormatter<T>
): (data: T[], message: string) => McpToolResult {
  return (data: T[], message: string) => {
    if (format === "markdown" && formatter) {
      const markdown = formatter.format(data);
      const truncated = enforceCharacterLimit(markdown, "tool", [
        "searchTerm",
        "pageSize",
      ]);

      return {
        content: [
          {
            type: "text",
            text: truncated.content,
          },
        ],
      };
    }

    // Default JSON format
    const jsonResponse: JsonResponse<T[]> = {
      message,
      data,
      timestamp: new Date().toISOString(),
      count: data.length,
    };

    const json = JSON.stringify(jsonResponse, null, 2);
    const truncated = enforceCharacterLimit(json, "tool", [
      "searchTerm",
      "pageSize",
    ]);

    return {
      content: [
        {
          type: "text",
          text: truncated.content,
        },
      ],
    };
  };
}

/**
 * Formatter registry
 *
 * Recommended structure for managing formatters:
 *
 * src/utils/formatting/
 * ├── index.ts                    # Export all formatters
 * ├── base.formatter.ts           # BaseMarkdownFormatter
 * ├── company.formatter.ts        # CompanyMarkdownFormatter
 * ├── contact.formatter.ts        # ContactMarkdownFormatter
 * ├── ticket.formatter.ts         # TicketMarkdownFormatter
 * ├── truncation.ts               # enforceCharacterLimit
 * └── response-factory.ts         # createResponseFormatter
 */
