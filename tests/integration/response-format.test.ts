import { formatAsJSON, formatAsMarkdown, shouldFormatAsMarkdown } from '../../src/utils/formatting/index';

describe('Response format switching', () => {
  const sampleData = {
    message: 'Found 2 companies',
    data: [
      { id: 1, companyName: 'Acme Corp', isActive: true },
      { id: 2, companyName: 'Globex', isActive: false },
    ],
  };

  test('formats data as pretty-printed JSON', () => {
    const output = formatAsJSON(sampleData);
    expect(output).toContain('"message": "Found 2 companies"');
    expect(output.split('\n').length).toBeGreaterThan(3);
  });

  test('wraps JSON in Markdown code block as fallback', () => {
    const output = formatAsMarkdown(sampleData, 'company');
    expect(output.startsWith('```json')).toBe(true);
    expect(output.trim().endsWith('```')).toBe(true);
  });

  test('determines when Markdown format is requested', () => {
    expect(shouldFormatAsMarkdown('markdown')).toBe(true);
    expect(shouldFormatAsMarkdown('json')).toBe(false);
    expect(shouldFormatAsMarkdown(undefined)).toBe(false);
  });
});
