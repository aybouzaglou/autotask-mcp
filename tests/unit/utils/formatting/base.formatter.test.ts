import { BaseFormatter } from "../../../../src/utils/formatting/base.formatter";

class TestFormatter extends BaseFormatter {
  // BaseFormatter is abstract, but no abstract methods need implementation.
  format(): string {
    return "";
  }

  public header(text: string, level?: number): string {
    return this.formatHeader(text, level);
  }

  public table(headers: string[], rows: (string | number | null | undefined)[][]): string {
    return this.formatTable(headers, rows);
  }

  public list(items: string[], ordered?: boolean): string {
    return this.formatList(items, ordered);
  }

  public timestamp(input: string | Date | null | undefined, includeTime?: boolean): string {
    return this.formatTimestamp(input, includeTime);
  }

  public keyValue(pairs: [string, string | number | null | undefined][]): string {
    return this.formatKeyValueSection(pairs);
  }

  public summary(title: string, items: string[]): string {
    return this.formatSummary(title, items);
  }

  public escape(text: string): string {
    return this.escapeMarkdown(text);
  }
}

describe("BaseFormatter", () => {
  const formatter = new TestFormatter();

  test("formats headers with the requested level", () => {
    expect(formatter.header("Overview", 3)).toBe("### Overview\n\n");
    expect(formatter.header("Fallback")).toBe("## Fallback\n\n");
    expect(formatter.header("Clamped Low", 0)).toBe("# Clamped Low\n\n");
    expect(formatter.header("Clamped High", 10)).toBe("###### Clamped High\n\n");
  });

  test("formats tables and escapes cell content", () => {
    const markdown = formatter.table(
      ["ID", "Name", "Notes"],
      [
        [1, "Acme Corp", "Supports | pipe"],
        [2, null, undefined],
      ],
    );

    expect(markdown).toContain("| ID | Name | Notes |");
    expect(markdown).toContain("| 1 | Acme Corp | Supports \\| pipe |");
    expect(markdown).toContain("| 2 | - | - |");
  });

  test("returns empty string when table headers or rows missing", () => {
    expect(formatter.table([], [])).toBe("");
    expect(formatter.table(["ID"], [])).toBe("");
  });

  test("formats unordered and ordered lists", () => {
    expect(formatter.list(["First", "Second"])).toBe("- First\n- Second\n\n");
    expect(formatter.list(["One", "Two"], true)).toBe("1. One\n2. Two\n\n");
  });

  test("formats timestamps and handles invalid values", () => {
    expect(formatter.timestamp("2025-10-19T12:34:56Z")).toBe("2025-10-19 12:34:56 UTC");
    expect(formatter.timestamp("2025-10-19T12:34:56Z", false)).toBe("2025-10-19");
    expect(formatter.timestamp("not-a-date")).toBe("-");
    expect(formatter.timestamp(null)).toBe("-");
  });

  test("formats key-value sections with placeholders for missing values", () => {
    const section = formatter.keyValue([
      ["ID", 123],
      ["Name", "Acme"],
      ["Owner", null],
    ]);

    expect(section).toBe("**ID:** 123  \n**Name:** Acme  \n**Owner:** -\n\n");
  });

  test("formats summary sections using header and list helpers", () => {
    const summary = formatter.summary("Search Results", ["Total: 5", "Active: 4"]);
    expect(summary).toContain("### Search Results");
    expect(summary).toContain("- Total: 5");
    expect(summary).toContain("- Active: 4");
  });

  test("escapes special Markdown characters", () => {
    expect(formatter.escape("#Heading *bold*")).toBe("\\#Heading \\*bold\\*");
  });
});
