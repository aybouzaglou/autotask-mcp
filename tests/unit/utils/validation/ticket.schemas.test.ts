import {
  SearchTicketsInputSchema,
  GetTicketDetailsInputSchema,
  CreateTicketInputSchema,
  UpdateTicketInputSchema,
} from "../../../../src/utils/validation/ticket.schemas";

describe("TicketSchemas", () => {
  test("validates ticket search filters", () => {
    const result = SearchTicketsInputSchema.safeParse({
      searchTerm: "network outage",
      companyID: 123,
      status: 5,
      assignedResourceID: 100,
      pageSize: 25,
    });
    expect(result.success).toBe(true);
  });

  test("rejects unexpected properties in search schema", () => {
    const invalid = SearchTicketsInputSchema.safeParse({
      searchTerm: "network outage",
      foo: "bar",
    });
    expect(invalid.success).toBe(false);
  });

  test("defaults fullDetails flag for get ticket details", () => {
    const result = GetTicketDetailsInputSchema.parse({
      ticketID: 42,
    });
    expect(result.fullDetails).toBe(false);
  });

  test("requires description and title for ticket creation", () => {
    const missingFields = CreateTicketInputSchema.safeParse({
      companyID: 1,
      title: "Outage",
    });
    expect(missingFields.success).toBe(false);

    const valid = CreateTicketInputSchema.safeParse({
      companyID: 1,
      title: "Outage",
      description: "Customers unable to access portal",
    });
    expect(valid.success).toBe(true);
  });

  test("enforces patch semantics and ISO date validation for updates", () => {
    const missingUpdateFields = UpdateTicketInputSchema.safeParse({
      ticketId: 1,
    });
    expect(missingUpdateFields.success).toBe(false);
    if (!missingUpdateFields.success) {
      expect(missingUpdateFields.error.issues[0].message).toContain("At least one field must be provided");
    }

    const invalidDate = UpdateTicketInputSchema.safeParse({
      ticketId: 1,
      dueDateTime: "19-10-2025",
    });
    expect(invalidDate.success).toBe(false);

    const validUpdate = UpdateTicketInputSchema.safeParse({
      ticketId: 1,
      status: 2,
      dueDateTime: "2025-10-19T15:30:00Z",
    });
    expect(validUpdate.success).toBe(true);
  });
});
