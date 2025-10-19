import {
  SearchCompaniesInputSchema,
  CreateCompanyInputSchema,
  UpdateCompanyInputSchema,
} from "../../../../src/utils/validation/company.schemas";

describe("CompanySchemas", () => {
  test("validates search parameters with optional filters", () => {
    const result = SearchCompaniesInputSchema.safeParse({
      searchTerm: "acme",
      isActive: true,
      pageSize: 100,
    });

    expect(result.success).toBe(true);
  });

  test("rejects out-of-range page sizes and unexpected fields for search", () => {
    const tooLarge = SearchCompaniesInputSchema.safeParse({
      searchTerm: "acme",
      pageSize: 600,
    });
    expect(tooLarge.success).toBe(false);

    const unexpected = SearchCompaniesInputSchema.safeParse({
      searchTerm: "acme",
      extra: true,
    });
    expect(unexpected.success).toBe(false);
    if (!unexpected.success) {
      expect(unexpected.error.issues[0].message).toContain("Unrecognized key");
    }
  });

  test("requires mandatory fields for create requests", () => {
    const missingName = CreateCompanyInputSchema.safeParse({
      companyType: 1,
    });
    expect(missingName.success).toBe(false);

    const validPayload = CreateCompanyInputSchema.safeParse({
      companyName: "Acme Corp",
      companyType: 1,
      phone: "+1 555 0199",
    });
    expect(validPayload.success).toBe(true);
  });

  test("enforces patch semantics for update requests", () => {
    const missingFields = UpdateCompanyInputSchema.safeParse({ id: 42 });
    expect(missingFields.success).toBe(false);
    if (!missingFields.success) {
      expect(missingFields.error.issues[0].message).toContain("At least one field");
    }

    const validUpdate = UpdateCompanyInputSchema.safeParse({
      id: 42,
      phone: "+1 555 0000",
    });
    expect(validUpdate.success).toBe(true);
  });
});
