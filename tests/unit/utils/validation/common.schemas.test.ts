import {
  PageSizeStandardSchema,
  PageSizeAttachmentsSchema,
  EmailSchema,
  PhoneSchema,
  DateStringSchema,
  ISODateTimeSchema,
  ResponseFormatSchema,
  createStringSchema,
  CommonSchemas,
} from "../../../../src/utils/validation/common.schemas";

describe("Common Validation Schemas", () => {
  describe("PageSizeStandardSchema", () => {
    test("accepts values within the allowed range", () => {
      expect(PageSizeStandardSchema.safeParse(-1).success).toBe(true);
      expect(PageSizeStandardSchema.safeParse(50).success).toBe(true);
      expect(PageSizeStandardSchema.safeParse(500).success).toBe(true);
    });

    test("rejects values outside the allowed range", () => {
      const result = PageSizeStandardSchema.safeParse(501);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 500");
      }
    });
  });

  describe("PageSizeAttachmentsSchema", () => {
    test("enforces minimum and maximum size constraints", () => {
      expect(PageSizeAttachmentsSchema.safeParse(1).success).toBe(true);
      expect(PageSizeAttachmentsSchema.safeParse(50).success).toBe(true);

      const tooSmall = PageSizeAttachmentsSchema.safeParse(0);
      expect(tooSmall.success).toBe(false);
      if (!tooSmall.success) {
        expect(tooSmall.error.issues[0].message).toContain("at least 1");
      }

      const tooLarge = PageSizeAttachmentsSchema.safeParse(100);
      expect(tooLarge.success).toBe(false);
      if (!tooLarge.success) {
        expect(tooLarge.error.issues[0].message).toContain("cannot exceed 50");
      }
    });
  });

  describe("EmailSchema", () => {
    test("normalises valid emails to lower-case trimmed values", () => {
      const result = EmailSchema.safeParse("USER@Example.COM");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
      }
    });

    test("rejects invalid email formats", () => {
      const result = EmailSchema.safeParse("invalid-email");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid email format");
      }
    });
  });

  describe("PhoneSchema", () => {
    test("accepts permitted characters", () => {
      expect(PhoneSchema.safeParse("+1 (555) 123-9876").success).toBe(true);
    });

    test("rejects disallowed characters", () => {
      const result = PhoneSchema.safeParse("555-1234#ext");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Phone must contain only digits");
      }
    });
  });

  describe("Date schemas", () => {
    test("DateStringSchema validates format and value", () => {
      expect(DateStringSchema.safeParse("2025-10-19").success).toBe(true);

      const invalid = DateStringSchema.safeParse("2025-13-01");
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain("valid date");
      }
    });

    test("ISODateTimeSchema only accepts ISO formatted strings", () => {
      expect(ISODateTimeSchema.safeParse("2025-10-19T15:30:00Z").success).toBe(true);
      expect(ISODateTimeSchema.safeParse("2025-10-19").success).toBe(false);
    });
  });

  describe("ResponseFormatSchema", () => {
    test("defaults to json when undefined", () => {
      expect(ResponseFormatSchema.parse(undefined)).toBe("json");
    });

    test("allows explicit markdown value", () => {
      expect(ResponseFormatSchema.safeParse("markdown").success).toBe(true);
    });
  });

  describe("createStringSchema helper", () => {
    test("enforces required strings when required=true", () => {
      const RequiredNameSchema = createStringSchema(20, "Company name", true);
      const result = RequiredNameSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot be empty");
      }
    });

    test("makes field optional when required=false", () => {
      const OptionalTitleSchema = createStringSchema(50, "Title", false);
      expect(OptionalTitleSchema.safeParse(undefined).success).toBe(true);
      const tooLong = OptionalTitleSchema.safeParse("x".repeat(60));
      expect(tooLong.success).toBe(false);
    });
  });

  describe("CommonSchemas export", () => {
    test("exposes the expected schema references", () => {
      expect(CommonSchemas.PageSizeStandard).toBe(PageSizeStandardSchema);
      expect(CommonSchemas.ResponseFormat.safeParse("json").success).toBe(true);
    });
  });
});
