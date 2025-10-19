import { AutotaskToolHandler } from '../../src/handlers/tool.handler';
import type { AutotaskService } from '../../src/services/autotask.service';
import type { Logger } from '../../src/utils/logger';

const createHandler = () => {
  const service = {
    searchCompanies: jest.fn(),
    createCompany: jest.fn(),
    ensureMetadataCacheInitialized: jest.fn().mockResolvedValue(undefined),
    getMetadataCache: jest.fn(),
  } as unknown as AutotaskService;

  const logger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  } as unknown as Logger;

  return {
    handler: new AutotaskToolHandler(service, logger),
    service,
    logger,
  };
};

describe('Zod validation integration', () => {
  test('returns structured error when company payload violates schema', async () => {
    const { handler, service } = createHandler();

    const response = await handler.callTool('autotask_create_company', {
      // Missing required companyName field
      companyType: 1,
    });

    expect(service.createCompany).not.toHaveBeenCalled();
    expect(response.isError).toBe(true);

    const text = response.content?.[0]?.text;
    expect(typeof text).toBe('string');
    const payload = JSON.parse(text as string);
    expect(payload.isError).toBe(true);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details[0]).toContain("Field 'companyName'");
    expect(payload.tool).toBe('autotask_create_company');
    expect(payload.timestamp).toBeDefined();
  });

  test('rejects unexpected parameters for search tools', async () => {
    const { handler, service } = createHandler();

    const response = await handler.callTool('autotask_search_companies', {
      searchTerm: 'acme',
      unsupported: true,
    });

    expect(service.searchCompanies).not.toHaveBeenCalled();
    expect(response.isError).toBe(true);

    const text = response.content?.[0]?.text;
    expect(typeof text).toBe('string');
    const payload = JSON.parse(text as string);
    expect(payload.error.guidance).toBe(
      'Remove unexpected parameters. Only parameters defined in the tool schema are allowed.',
    );
    expect(payload.error.details[0]).toContain('unsupported');
  });
});
