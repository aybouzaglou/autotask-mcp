import { SearchContactsInputSchema, CreateContactInputSchema } from '../../../../src/utils/validation/contact.schemas';

describe('ContactSchemas', () => {
  test('validates contact search filters', () => {
    const result = SearchContactsInputSchema.safeParse({
      searchTerm: 'smith',
      companyID: 123,
      isActive: 1,
      pageSize: 25,
    });
    expect(result.success).toBe(true);
  });

  test('rejects invalid isActive values', () => {
    const invalid = SearchContactsInputSchema.safeParse({
      searchTerm: 'smith',
      isActive: 2,
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0].message).toContain('isActive must be 0 (inactive) or 1 (active)');
    }
  });

  test('requires mandatory fields for create contact', () => {
    const missingLastName = CreateContactInputSchema.safeParse({
      companyID: 1,
      firstName: 'Alice',
    });
    expect(missingLastName.success).toBe(false);

    const valid = CreateContactInputSchema.safeParse({
      companyID: 1,
      firstName: 'Alice',
      lastName: 'Smith',
      emailAddress: 'alice@example.com',
      phone: '+1 555 1234',
      title: 'Account Manager',
    });
    expect(valid.success).toBe(true);
  });
});
