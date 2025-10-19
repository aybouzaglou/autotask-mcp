import { BaseFormatter } from '../../../../src/utils/formatting/base.formatter';

interface Company {
  id: number;
  companyName: string;
  isActive: boolean;
}

class CompanyFormatter extends BaseFormatter {
  format(companies: Company[]): string {
    if (companies.length === 0) {
      return this.formatHeader('Companies', 2) + '_No companies found._\n';
    }

    const header = this.formatHeader('Companies', 2);
    const table = this.formatTable(
      ['ID', 'Name', 'Status'],
      companies.map((company) => [company.id, company.companyName, company.isActive ? 'Active' : 'Inactive']),
    );

    return header + table;
  }
}

describe('CompanyFormatter', () => {
  const formatter = new CompanyFormatter();
  const companies: Company[] = [
    { id: 101, companyName: 'Acme Corp', isActive: true },
    { id: 102, companyName: 'Globex', isActive: false },
  ];

  test('formats company list as Markdown table', () => {
    const markdown = formatter.format(companies);

    expect(markdown).toContain('## Companies');
    expect(markdown).toContain('| ID | Name | Status |');
    expect(markdown).toContain('| 101 | Acme Corp | Active |');
    expect(markdown).toContain('| 102 | Globex | Inactive |');
  });

  test('handles empty collections gracefully', () => {
    const markdown = formatter.format([]);
    expect(markdown).toContain('## Companies');
    expect(markdown).toContain('_No companies found._');
  });
});
