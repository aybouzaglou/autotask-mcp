// Unit tests for update_ticket handling flow
// Covers combined updates and validation behavior

import { AutotaskToolHandler } from "../../../src/handlers/tool.handler";
import type { AutotaskService } from "../../../src/services/autotask.service";
import type { Logger } from "../../../src/utils/logger";
import {
  MOCK_TICKET_STATUSES,
  MOCK_TICKET_PRIORITIES,
  MOCK_ACTIVE_RESOURCES,
} from "../../setup";

const createHandler = (overrides: Partial<AutotaskService> = {}) => {
  const mockMetadataCache = {
    isValidStatus: (id: number) =>
      MOCK_TICKET_STATUSES.some((s) => s.id === id),
    isValidPriority: (id: number) =>
      MOCK_TICKET_PRIORITIES.some((p) => p.id === id),
    isValidResource: (id: number) =>
      MOCK_ACTIVE_RESOURCES.some((r) => r.id === id),
    getAllStatuses: () => MOCK_TICKET_STATUSES,
    getAllPriorities: () => MOCK_TICKET_PRIORITIES,
    getAllResources: () => MOCK_ACTIVE_RESOURCES,
    getResource: (id: number) => MOCK_ACTIVE_RESOURCES.find((r) => r.id === id),
  };

  const mockService = {
    updateTicket: jest.fn(),
    getMetadataCache: jest.fn().mockReturnValue(mockMetadataCache),
    ...overrides,
  } as unknown as AutotaskService;

  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  } as unknown as Logger;

  return {
    handler: new AutotaskToolHandler(mockService, mockLogger),
    mockService,
  };
};

describe("AutotaskToolHandler.update_ticket", () => {
  test("lists update_ticket tool with ticketId requirement", async () => {
    const { handler } = createHandler();
    const tools = await handler.listTools();
    const updateTool = tools.find((tool) => tool.name === "update_ticket");

    expect(updateTool).toBeDefined();
    expect(updateTool?.inputSchema.required).toContain("ticketId");
  });

  test("updates assignment, status, and priority together", async () => {
    const { handler, mockService } = createHandler();
    const mockUpdatedTicket = {
      id: 321,
      status: 2,
      priority: 3,
      assignedResourceID: 100,
    };
    (mockService.updateTicket as jest.Mock).mockResolvedValue(
      mockUpdatedTicket,
    );

    const response = await handler.callTool("update_ticket", {
      ticketId: 321,
      assignedResourceID: 100,
      status: 2,
      priority: 3,
      queueID: 55,
      description: "Coordinated field updates",
    });

    expect(mockService.updateTicket).toHaveBeenCalledTimes(1);
    const [ticketId, payload] = (mockService.updateTicket as jest.Mock).mock
      .calls[0];
    expect(ticketId).toBe(321);
    expect(payload).toMatchObject({
      assignedResourceID: 100,
      status: 2,
      priority: 3,
      queueID: 55,
      description: "Coordinated field updates",
    });

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.message).toBe("Ticket 321 updated successfully");
    expect(parsed.data.updatedFields).toEqual(
      expect.arrayContaining([
        "assignedResourceID",
        "status",
        "priority",
        "queueID",
        "description",
      ]),
    );
    expect(parsed.data.ticket).toEqual(mockUpdatedTicket);
    expect(response.isError).toBeUndefined();
  });

  test("fails validation when status is not recognised", async () => {
    const { handler, mockService } = createHandler();

    const response = await handler.callTool("update_ticket", {
      ticketId: 123,
      status: 999,
    });

    expect(mockService.updateTicket).not.toHaveBeenCalled();
    expect(response.isError).toBe(true);

    const payload = JSON.parse(response.content[0].text);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
    expect(payload.error.guidance).toContain("Invalid status ID");
  });

  test("fails when no mutable fields are supplied", async () => {
    const { handler, mockService } = createHandler();

    const response = await handler.callTool("update_ticket", { ticketId: 456 });

    expect(mockService.updateTicket).not.toHaveBeenCalled();
    expect(response.isError).toBe(true);

    const payload = JSON.parse(response.content[0].text);
    expect(payload.isError).toBe(true);
    expect(payload.error.message).toContain(
      "At least one field must be provided",
    );
  });
});
