import {
  ToolCategory,
  getToolCategory,
  getRecommendedAnnotations,
  validateAnnotations,
  validateAllToolAnnotations,
  READ_ONLY_ANNOTATIONS,
  CREATE_ANNOTATIONS,
} from "../../../../src/utils/validation/tool-annotations";

describe("Tool Annotations", () => {
  test("detects tool categories from names", () => {
    expect(getToolCategory("autotask_search_companies")).toBe(ToolCategory.SEARCH);
    expect(getToolCategory("autotask_get_ticket_details")).toBe(ToolCategory.GET);
    expect(getToolCategory("autotask_create_ticket")).toBe(ToolCategory.CREATE);
    expect(getToolCategory("autotask_update_ticket")).toBe(ToolCategory.UPDATE);
    expect(getToolCategory("autotask_test_connection")).toBe(ToolCategory.TEST);
    // Defaults to GET for unknown patterns
    expect(getToolCategory("autotask_unknown_tool")).toBe(ToolCategory.GET);
  });

  test("recommends annotations based on category and preserves title", () => {
    expect(getRecommendedAnnotations("autotask_search_companies")).toMatchObject(READ_ONLY_ANNOTATIONS);
    expect(getRecommendedAnnotations("autotask_create_ticket")).toMatchObject(CREATE_ANNOTATIONS);

    const withTitle = getRecommendedAnnotations("autotask_search_companies", "Search Companies");
    expect(withTitle.title).toBe("Search Companies");
  });

  test("validates annotations for consistency rules", () => {
    const valid = validateAnnotations({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
    expect(valid.valid).toBe(true);

    const invalid = validateAnnotations({
      readOnlyHint: true,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
      title: "A tool with a title that is intentionally over fifty characters long",
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toEqual(
      expect.arrayContaining([
        "destructiveHint is only meaningful when readOnlyHint is false",
        "idempotentHint is only meaningful when readOnlyHint is false",
        "title should be 50 characters or less",
      ]),
    );
  });

  test("validates collections of tool annotations", () => {
    const report = validateAllToolAnnotations([
      { name: "autotask_search_companies", annotations: READ_ONLY_ANNOTATIONS },
      { name: "autotask_create_ticket" },
      {
        name: "autotask_get_ticket_details",
        annotations: {
          readOnlyHint: true,
          destructiveHint: true,
          openWorldHint: true,
        },
      },
    ]);

    expect(report.valid).toBe(false);
    expect(report.missingAnnotations).toEqual(["autotask_create_ticket"]);
    expect(report.invalidAnnotations).toHaveLength(1);
    expect(report.invalidAnnotations[0]).toMatchObject({
      toolName: "autotask_get_ticket_details",
    });
  });
});
