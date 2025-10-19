/**
 * Base Markdown Formatter
 *
 * Abstract base class providing common Markdown formatting utilities
 * for entity-specific formatters.
 *
 * @see specs/004-mcp-best-practices-review/spec.md FR-003
 */

/**
 * Abstract base class for Markdown formatters
 *
 * Provides reusable formatting methods for creating consistent,
 * human-readable Markdown output across all entity types.
 *
 * @abstract
 * @example
 * ```typescript
 * class CompanyFormatter extends BaseFormatter {
 *   format(companies: Company[]): string {
 *     let output = this.formatHeader("Companies", 1);
 *     output += this.formatTable(
 *       ["ID", "Name", "Status"],
 *       companies.map(c => [c.id, c.companyName, c.isActive ? "Active" : "Inactive"])
 *     );
 *     return output;
 *   }
 * }
 * ```
 */
export abstract class BaseFormatter {
  /**
   * Format a Markdown header
   *
   * @param text - Header text
   * @param level - Header level (1-6)
   * @returns Formatted Markdown header
   *
   * @example
   * ```typescript
   * this.formatHeader("Search Results", 2);
   * // Returns: "## Search Results\n\n"
   * ```
   */
  protected formatHeader(text: string, level: number = 2): string {
    const hashes = '#'.repeat(Math.max(1, Math.min(6, level)));
    return `${hashes} ${text}\n\n`;
  }

  /**
   * Format a Markdown table
   *
   * Creates a GitHub Flavored Markdown table with headers and rows.
   * Automatically aligns columns and handles empty values.
   *
   * @param headers - Array of column headers
   * @param rows - Array of row arrays (one array per row)
   * @returns Formatted Markdown table
   *
   * @example
   * ```typescript
   * this.formatTable(
   *   ["ID", "Name", "Status"],
   *   [
   *     ["1", "Acme Corp", "Active"],
   *     ["2", "TechCo", "Inactive"]
   *   ]
   * );
   * // Returns:
   * // | ID | Name | Status |
   * // |----|------|--------|
   * // | 1 | Acme Corp | Active |
   * // | 2 | TechCo | Inactive |
   * ```
   */
  protected formatTable(headers: string[], rows: (string | number | null | undefined)[][]): string {
    if (headers.length === 0 || rows.length === 0) {
      return '';
    }

    // Format headers
    const headerRow = '| ' + headers.join(' | ') + ' |';
    const separatorRow = '| ' + headers.map(() => '---').join(' | ') + ' |';

    // Format data rows
    const dataRows = rows.map((row) => {
      const cells = row.map((cell) => this.formatTableCell(cell));
      return '| ' + cells.join(' | ') + ' |';
    });

    return [headerRow, separatorRow, ...dataRows, ''].join('\n');
  }

  /**
   * Format a table cell value
   *
   * Handles null/undefined values and escapes pipe characters
   * that would break Markdown table formatting.
   *
   * @param value - Cell value to format
   * @returns Formatted cell value
   *
   * @internal
   */
  private formatTableCell(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }
    // Escape pipe characters to prevent breaking table formatting
    return String(value).replace(/\|/g, '\\|');
  }

  /**
   * Format a Markdown list
   *
   * Creates a bulleted or numbered list from an array of items.
   *
   * @param items - Array of list items
   * @param ordered - Whether to create a numbered list (default: false)
   * @returns Formatted Markdown list
   *
   * @example
   * ```typescript
   * this.formatList(["Item 1", "Item 2", "Item 3"]);
   * // Returns:
   * // - Item 1
   * // - Item 2
   * // - Item 3
   *
   * this.formatList(["First", "Second", "Third"], true);
   * // Returns:
   * // 1. First
   * // 2. Second
   * // 3. Third
   * ```
   */
  protected formatList(items: string[], ordered: boolean = false): string {
    if (items.length === 0) {
      return '';
    }

    return (
      items
        .map((item, index) => {
          const bullet = ordered ? `${index + 1}.` : '-';
          return `${bullet} ${item}`;
        })
        .join('\n') + '\n\n'
    );
  }

  /**
   * Format a timestamp into human-readable format
   *
   * Converts ISO 8601 timestamps or Date objects into a readable format.
   *
   * @param timestamp - ISO 8601 string, Date object, or null/undefined
   * @param includeTime - Whether to include time (default: true)
   * @returns Formatted date string or "-" for null/undefined
   *
   * @example
   * ```typescript
   * this.formatTimestamp("2025-10-17T14:30:00Z");
   * // Returns: "2025-10-17 14:30:00 UTC"
   *
   * this.formatTimestamp("2025-10-17T14:30:00Z", false);
   * // Returns: "2025-10-17"
   *
   * this.formatTimestamp(null);
   * // Returns: "-"
   * ```
   */
  protected formatTimestamp(timestamp: string | Date | null | undefined, includeTime: boolean = true): string {
    if (!timestamp) {
      return '-';
    }

    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

      if (isNaN(date.getTime())) {
        return '-';
      }

      if (includeTime) {
        return date
          .toISOString()
          .replace('T', ' ')
          .replace(/\.\d{3}Z$/, ' UTC');
      }

      return date.toISOString().split('T')[0];
    } catch (error) {
      return '-';
    }
  }

  /**
   * Format a key-value pair section
   *
   * Creates a formatted section showing key-value pairs.
   *
   * @param pairs - Array of [key, value] tuples
   * @returns Formatted Markdown section
   *
   * @example
   * ```typescript
   * this.formatKeyValueSection([
   *   ["ID", "12345"],
   *   ["Name", "Acme Corp"],
   *   ["Status", "Active"]
   * ]);
   * // Returns:
   * // **ID:** 12345
   * // **Name:** Acme Corp
   * // **Status:** Active
   * ```
   */
  protected formatKeyValueSection(pairs: [string, string | number | null | undefined][]): string {
    return (
      pairs
        .map(([key, value]) => {
          const formattedValue = value === null || value === undefined ? '-' : String(value);
          return `**${key}:** ${formattedValue}`;
        })
        .join('  \n') + '\n\n'
    );
  }

  /**
   * Format a summary section
   *
   * Creates a summary box with key statistics or information.
   *
   * @param title - Summary title
   * @param items - Array of summary items
   * @returns Formatted Markdown summary
   *
   * @example
   * ```typescript
   * this.formatSummary("Search Results", [
   *   "Total: 42 companies",
   *   "Active: 38",
   *   "Inactive: 4"
   * ]);
   * // Returns:
   * // ### Search Results
   * //
   * // - Total: 42 companies
   * // - Active: 38
   * // - Inactive: 4
   * ```
   */
  protected formatSummary(title: string, items: string[]): string {
    let output = this.formatHeader(title, 3);
    output += this.formatList(items, false);
    return output;
  }

  /**
   * Escape Markdown special characters
   *
   * Escapes characters that have special meaning in Markdown to prevent
   * formatting issues.
   *
   * @param text - Text to escape
   * @returns Escaped text
   *
   * @internal
   */
  protected escapeMarkdown(text: string): string {
    return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
  }
}
