// Tool Handler Tests
// Focused on update_ticket tool validation and behavior

import { AutotaskToolHandler } from '../src/handlers/tool.handler';
import type { AutotaskService } from '../src/services/autotask.service';
import type { Logger } from '../src/utils/logger';

describe('AutotaskToolHandler - update_ticket', () => {
  const createHandler = (overrides: Partial<AutotaskService> = {}) => {
    const mockService = {
      updateTicket: jest.fn(),
      ...overrides,
    } as unknown as AutotaskService;

    const mockLogger: Logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
    } as unknown as Logger;

    return { handler: new AutotaskToolHandler(mockService, mockLogger), mockService };
  };

  test('listTools advertises update_ticket with required ticketId', async () => {
    const { handler } = createHandler();
    const tools = await handler.listTools();
    const updateTool = tools.find((tool) => tool.name === 'update_ticket');

    expect(updateTool).toBeDefined();
    expect(updateTool?.inputSchema.required).toContain('ticketId');
  });

  test('callTool throws when no mutable fields are provided', async () => {
    const { handler, mockService } = createHandler();

    const response = await handler.callTool('update_ticket', { ticketId: 42 });

    expect(mockService.updateTicket).not.toHaveBeenCalled();
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('At least one mutable field must be provided');
  });

  test('callTool delegates to service with filtered updates and returns success payload', async () => {
    const { handler, mockService } = createHandler();
    (mockService.updateTicket as jest.Mock).mockResolvedValue(undefined);

    const response = await handler.callTool('update_ticket', {
      ticketId: 101,
      status: 5,
      description: 'Updated by test',
      ignoredField: 'should be dropped',
    });

    expect(mockService.updateTicket).toHaveBeenCalledWith(101, {
      status: 5,
      description: 'Updated by test',
    });

    expect(response.isError).toBeUndefined();
    expect(response.content[0].text).toContain('Ticket 101 updated successfully');
  });
});
