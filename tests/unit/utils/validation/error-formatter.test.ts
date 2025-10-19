import { z } from 'zod';
import { formatZodError, deriveGuidance } from '../../../../src/utils/validation/error-formatter';

describe('Validation Error Formatter', () => {
  test('formats invalid type errors with field context and guidance', () => {
    const schema = z
      .object({
        isActive: z.boolean(),
      })
      .strict();

    const result = schema.safeParse({ isActive: 'true' });
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const formatted = formatZodError(result.error, 'autotask_search_companies');

    expect(formatted.code).toBe('VALIDATION_ERROR');
    expect(formatted.message).toBe('Invalid parameters for autotask_search_companies');
    expect(formatted.details[0]).toContain("Field 'isActive'");
    expect(formatted.details[0]).toContain('received: string');
    expect(formatted.guidance).toBe(
      'Check parameter types. Ensure strings, numbers, and booleans match expected types.',
    );
    expect(formatted.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test('uses unexpected-keys guidance when extra parameters provided', () => {
    const schema = z
      .object({
        searchTerm: z.string().optional(),
      })
      .strict();

    const result = schema.safeParse({ searchTerm: 'acme', unexpected: true });
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const formatted = formatZodError(result.error, 'autotask_search_companies');
    expect(formatted.guidance).toBe(
      'Remove unexpected parameters. Only parameters defined in the tool schema are allowed.',
    );
    expect(formatted.details[0]).toContain("Field 'root'");
  });
});

describe('deriveGuidance', () => {
  test('returns custom guidance for size constraints', () => {
    const issue: z.ZodIssue = {
      code: z.ZodIssueCode.too_big,
      maximum: 500,
      type: 'number',
      inclusive: true,
      message: 'Too many results requested',
      path: ['pageSize'],
    };

    expect(deriveGuidance([issue])).toBe('Check parameter constraints (min/max values, string lengths, array sizes).');
  });

  test('falls back to generic message when no specialised guidance applies', () => {
    expect(deriveGuidance([])).toBe(
      'Review the parameter requirements and ensure all values meet the specified constraints.',
    );
  });
});
