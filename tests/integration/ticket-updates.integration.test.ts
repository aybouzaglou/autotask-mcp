// Integration-style tests for coordinated ticket updates

import { AutotaskToolHandler } from '../../src/handlers/tool.handler';
import { AutotaskService } from '../../src/services/autotask.service';
import type { Logger } from '../../src/utils/logger';
import { MOCK_ACTIVE_RESOURCES, MOCK_TICKET_PRIORITIES, MOCK_TICKET_STATUSES } from '../setup';

const createLogger = (): Logger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  }) as unknown as Logger;

const metadataStub = {
  isValidStatus: (id: number) => MOCK_TICKET_STATUSES.some((status) => status.id === id),
  isValidPriority: (id: number) => MOCK_TICKET_PRIORITIES.some((priority) => priority.id === id),
  isValidResource: (id: number | null) => id === null || MOCK_ACTIVE_RESOURCES.some((resource) => resource.id === id),
  getAllStatuses: () => MOCK_TICKET_STATUSES,
  getAllPriorities: () => MOCK_TICKET_PRIORITIES,
  getResource: (id: number) => MOCK_ACTIVE_RESOURCES.find((resource) => resource.id === id),
  getAllResources: () => MOCK_ACTIVE_RESOURCES,
};

const createService = (logger: Logger) => {
  const service = new AutotaskService(
    {
      name: 'autotask-mcp-test',
      version: '1.0.0',
      autotask: {},
    },
    logger,
  );

  jest.spyOn(service, 'getMetadataCache').mockReturnValue(metadataStub as any);
  jest.spyOn(service, 'ensureMetadataCacheInitialized').mockResolvedValue();
  return service;
};

const parseResponse = (response: any) => {
  const text = response.content?.[0]?.text;
  expect(typeof text).toBe('string');
  return JSON.parse(text as string);
};

const stubValidator = (handler: AutotaskToolHandler) => {
  const validateTicketUpdate = jest.fn().mockImplementation((request: any) => ({
    validation: { isValid: true, errors: [] },
    payload: request,
  }));

  const validateTicketNote = jest.fn().mockImplementation((request: any) => ({
    validation: { isValid: true, errors: [] },
    payload: request,
  }));

  jest.spyOn(handler as any, 'getValidator').mockReturnValue({
    validateTicketUpdate,
    validateTicketNote,
  });

  return { validateTicketUpdate, validateTicketNote };
};

describe('Ticket update flow', () => {
  test('handler delegates combined updates and service emits PascalCase payload', async () => {
    const logger = createLogger();
    const service = createService(logger);
    const updateMock = jest.fn().mockResolvedValue({
      data: {
        id: 777,
        status: 5,
        priority: 4,
        queueID: 12,
      },
    });

    (service as any).client = {
      tickets: {
        update: updateMock,
      },
    };

    const handler = new AutotaskToolHandler(service, logger);
    const { validateTicketUpdate } = stubValidator(handler);

    const response = await handler.callTool('autotask_update_ticket', {
      ticketId: 777,
      status: 5,
      priority: 4,
      queueID: 12,
      description: 'Batch update from integration spec',
    });

    expect(validateTicketUpdate).toHaveBeenCalledWith({
      id: 777,
      status: 5,
      priority: 4,
      queueID: 12,
      description: 'Batch update from integration spec',
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith(777, {
      Status: 5,
      Priority: 4,
      QueueID: 12,
      Description: 'Batch update from integration spec',
    });

    const payload = parseResponse(response);
    expect(payload.message).toBe('Ticket 777 updated successfully');
    expect(payload.data.updatedFields).toEqual(
      expect.arrayContaining(['status', 'priority', 'queueID', 'description']),
    );
    expect(payload.data.ticket).toEqual({
      id: 777,
      status: 5,
      priority: 4,
      queueID: 12,
    });
  });

  test('handler allows status-only updates', async () => {
    const logger = createLogger();
    const service = createService(logger);
    const updateMock = jest.fn().mockResolvedValue({
      data: {
        id: 990,
        status: 2,
      },
    });

    (service as any).client = {
      tickets: {
        update: updateMock,
      },
    };

    const handler = new AutotaskToolHandler(service, logger);
    const { validateTicketUpdate } = stubValidator(handler);

    const response = await handler.callTool('autotask_update_ticket', {
      ticketId: 990,
      status: 2,
    });

    expect(validateTicketUpdate).toHaveBeenCalledWith({
      id: 990,
      status: 2,
    });

    expect(updateMock).toHaveBeenCalledWith(990, {
      Status: 2,
    });

    const payload = parseResponse(response);
    expect(payload.data.updatedFields).toEqual(expect.arrayContaining(['status']));
    expect(payload.data.ticket.status).toBe(2);
  });
});

describe('Ticket note creation flow', () => {
  test('handler creates internal note with publish=1 and service forwards correctly', async () => {
    const logger = createLogger();
    const service = createService(logger);
    const createNoteMock = jest.fn().mockResolvedValue({
      data: {
        id: 55555,
        ticketID: 12345,
        title: 'Internal Investigation',
        description: 'Checking logs for root cause analysis',
        publish: 1,
        createdDateTime: '2025-10-16T10:00:00Z',
      },
    });

    (service as any).client = {
      notes: {
        create: createNoteMock,
      },
    };

    const handler = new AutotaskToolHandler(service, logger);

    const response = await handler.callTool('autotask_create_ticket_note', {
      ticketId: 12345,
      title: 'Internal Investigation',
      description: 'Checking logs for root cause analysis',
      publish: 1,
    });

    expect(createNoteMock).toHaveBeenCalledTimes(1);
    expect(createNoteMock).toHaveBeenCalledWith({
      TicketID: 12345,
      Title: 'Internal Investigation',
      Description: 'Checking logs for root cause analysis',
      Publish: 1,
    });

    const payload = parseResponse(response);
    expect(payload.message).toContain('Note created successfully');
    expect(payload.data).toMatchObject({
      id: 55555,
      ticketID: 12345,
      publish: 1,
    });
  });

  test('handler creates external note with publish=3 and service forwards correctly', async () => {
    const logger = createLogger();
    const service = createService(logger);
    const createNoteMock = jest.fn().mockResolvedValue({
      data: {
        id: 55556,
        ticketID: 12345,
        title: 'Customer Update',
        description: 'We have identified the issue and are working on a fix',
        publish: 3,
        createdDateTime: '2025-10-16T10:30:00Z',
      },
    });

    (service as any).client = {
      notes: {
        create: createNoteMock,
      },
    };

    const handler = new AutotaskToolHandler(service, logger);

    const response = await handler.callTool('autotask_create_ticket_note', {
      ticketId: 12345,
      title: 'Customer Update',
      description: 'We have identified the issue and are working on a fix',
      publish: 3,
    });

    expect(createNoteMock).toHaveBeenCalledTimes(1);
    expect(createNoteMock).toHaveBeenCalledWith({
      TicketID: 12345,
      Title: 'Customer Update',
      Description: 'We have identified the issue and are working on a fix',
      Publish: 3,
    });

    const payload = parseResponse(response);
    expect(payload.message).toContain('Note created successfully');
    expect(payload.data).toMatchObject({
      id: 55556,
      ticketID: 12345,
      publish: 3,
    });
  });

  test('handler rejects note with invalid publish level', async () => {
    const logger = createLogger();
    const service = createService(logger);

    const handler = new AutotaskToolHandler(service, logger);

    const response = await handler.callTool('autotask_create_ticket_note', {
      ticketId: 12345,
      description: 'Test note',
      publish: 2, // Invalid publish level
    });

    expect(response.isError).toBe(true);
    const payload = parseResponse(response);
    expect(payload.isError).toBe(true);
    // Should contain validation error message
    expect(payload.error.guidance).toContain('Invalid publish level');
  });

  test('handler allows note without title (optional field)', async () => {
    const logger = createLogger();
    const service = createService(logger);
    const createNoteMock = jest.fn().mockResolvedValue({
      data: {
        id: 55557,
        ticketID: 12345,
        description: 'Note without title',
        publish: 1,
        createdDateTime: '2025-10-16T11:00:00Z',
      },
    });

    (service as any).client = {
      notes: {
        create: createNoteMock,
      },
    };

    const handler = new AutotaskToolHandler(service, logger);

    const response = await handler.callTool('autotask_create_ticket_note', {
      ticketId: 12345,
      description: 'Note without title',
      publish: 1,
    });

    expect(createNoteMock).toHaveBeenCalledWith({
      TicketID: 12345,
      Description: 'Note without title',
      Publish: 1,
    });

    const payload = parseResponse(response);
    expect(payload.data.id).toBe(55557);
  });

  test('handler validates note description length limits', async () => {
    const logger = createLogger();
    const service = createService(logger);

    const handler = new AutotaskToolHandler(service, logger);

    const tooLongDescription = 'A'.repeat(32001); // Exceeds 32k limit

    const response = await handler.callTool('autotask_create_ticket_note', {
      ticketId: 12345,
      description: tooLongDescription,
      publish: 1,
    });

    expect(response.isError).toBe(true);
    const payload = parseResponse(response);
    expect(payload.isError).toBe(true);
    // Should contain validation error about length
    expect(payload.error.guidance).toContain('parameter constraints');
    expect(payload.error.details[0]).toContain('cannot exceed 32000 characters');
  });
});
