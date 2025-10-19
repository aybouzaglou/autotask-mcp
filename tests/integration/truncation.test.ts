import { enforceCharacterLimit, CHARACTER_LIMIT } from '../../src/utils/formatting/truncation';
import { formatAsJSON } from '../../src/utils/formatting/index';

describe('Character limit enforcement integration', () => {
  test('keeps responses that are within the limit unchanged', () => {
    const payload = { message: 'OK', data: Array.from({ length: 3 }, (_, i) => ({ id: i + 1 })) };
    const formatted = formatAsJSON(payload);
    const result = enforceCharacterLimit(formatted, 'autotask_search_companies');
    expect(result).toBe(formatted);
  });

  test('truncates oversized JSON responses and appends notice', () => {
    const largeArray = Array.from({ length: 2000 }, (_, i) => ({ id: i, name: `Company ${i}` }));
    const formatted = formatAsJSON({ data: largeArray });
    expect(formatted.length).toBeGreaterThan(CHARACTER_LIMIT);

    const result = enforceCharacterLimit(formatted, 'autotask_search_companies');
    expect(result.length).toBeGreaterThan(CHARACTER_LIMIT);
    expect(result.startsWith(formatted.slice(0, CHARACTER_LIMIT))).toBe(true);
    expect(result).toContain('[RESPONSE TRUNCATED]');
  });
});
