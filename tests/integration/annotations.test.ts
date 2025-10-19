import { AutotaskToolHandler } from '../../src/handlers/tool.handler';
import type { AutotaskService } from '../../src/services/autotask.service';
import type { Logger } from '../../src/utils/logger';

const createHandler = () => {
  const service = {} as unknown as AutotaskService;
  const logger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  } as unknown as Logger;

  return new AutotaskToolHandler(service, logger);
};

describe('Tool annotations', () => {
  test('listTools exposes consistent annotation hints', async () => {
    const handler = createHandler();
    const tools = await handler.listTools();

    const searchTool = tools.find((tool) => tool.name === 'autotask_search_companies');
    expect(searchTool?.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });

    const createTool = tools.find((tool) => tool.name === 'autotask_create_company');
    expect(createTool?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });

    const updateTool = tools.find((tool) => tool.name === 'autotask_update_ticket');
    expect(updateTool?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });

    const testConnection = tools.find((tool) => tool.name === 'autotask_test_connection');
    expect(testConnection?.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });
});
