import {
  enforceCharacterLimit,
  CHARACTER_LIMIT,
} from "../../../../src/utils/formatting/truncation";

const createOversizedPayload = () => "x".repeat(CHARACTER_LIMIT + 42);

describe("enforceCharacterLimit", () => {
  test("returns original content when within limit", () => {
    const input = "short payload";
    expect(enforceCharacterLimit(input, "autotask_search_companies")).toBe(input);
  });

  test("truncates and appends guidance for search tools", () => {
    const input = createOversizedPayload();
    const result = enforceCharacterLimit(input, "autotask_search_companies");

    expect(result.startsWith(input.slice(0, CHARACTER_LIMIT))).toBe(true);
    expect(result).toContain("[RESPONSE TRUNCATED]");
    expect(result).toContain("Decrease the 'pageSize' parameter");
    expect(result).toContain("Use 'response_format: \"markdown\"'");
  });

  test("provides tailored guidance for get tools", () => {
    const input = createOversizedPayload();
    const result = enforceCharacterLimit(input, "autotask_get_ticket_details");

    expect(result).toContain("Request specific sections instead of the full entity");
  });

  test("provides attachment-specific guidance", () => {
    const input = createOversizedPayload();
    const result = enforceCharacterLimit(input, "autotask_attachment_manager");

    const notice = result.slice(CHARACTER_LIMIT);
    expect(notice.toLowerCase()).toContain("attachments are large objects");
  });

  test("falls back to generic guidance for other tools", () => {
    const input = createOversizedPayload();
    const result = enforceCharacterLimit(input, "autotask_create_ticket");

    expect(result).toContain("Add more specific filters to narrow results");
  });
});
