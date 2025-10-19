import {
  isValidAutotaskToolName,
  validateAllToolNames,
  getToolNameWithoutPrefix,
  addAutotaskPrefix,
} from "../../../../src/utils/validation/tool-name.validator";

describe("Tool Name Validator", () => {
  test("validates autotask-prefixed names", () => {
    expect(isValidAutotaskToolName("autotask_search_companies")).toBe(true);
    expect(isValidAutotaskToolName("search_companies")).toBe(false);
    expect(isValidAutotaskToolName("autotask_Search_Companies")).toBe(false);
    expect(isValidAutotaskToolName("autotask_")).toBe(false);
  });

  test("validates collections of tool names", () => {
    const result = validateAllToolNames([
      "autotask_search_companies",
      "invalid name",
      "autotask_update_ticket",
    ]);

    expect(result.allValid).toBe(false);
    expect(result.valid).toEqual([
      "autotask_search_companies",
      "autotask_update_ticket",
    ]);
    expect(result.invalid).toEqual(["invalid name"]);
  });

  test("strips prefix when name is valid", () => {
    expect(getToolNameWithoutPrefix("autotask_search_companies")).toBe("search_companies");
    expect(getToolNameWithoutPrefix("search_companies")).toBeNull();
  });

  test("adds prefix when missing", () => {
    expect(addAutotaskPrefix("autotask_search_companies")).toBe("autotask_search_companies");
    expect(addAutotaskPrefix("get_ticket_details")).toBe("autotask_get_ticket_details");
  });
});
