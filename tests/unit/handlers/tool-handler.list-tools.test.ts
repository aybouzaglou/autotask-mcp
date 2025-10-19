import { AutotaskToolHandler } from '../../../src/handlers/tool.handler';
import type { AutotaskService } from '../../../src/services/autotask.service';
import type { Logger } from '../../../src/utils/logger';
import { validateAllToolNames } from '../../../src/utils/validation/tool-name.validator';
import { validateAllToolAnnotations } from '../../../src/utils/validation/tool-annotations';

describe('AutotaskToolHandler.listTools compliance checks', () => {
  const createHandler = () => {
    const mockService = {
      testConnection: jest.fn(),
    } as unknown as AutotaskService;

    const logger: Logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
    } as unknown as Logger;

    return new AutotaskToolHandler(mockService, logger);
  };

  test('all tools expose autotask_ prefix, annotations, and JSON schemas', async () => {
    const handler = createHandler();
    const tools = await handler.listTools();

    const names = tools.map((tool) => tool.name);
    const annotationsCheck = validateAllToolAnnotations(tools);
    const nameCheck = validateAllToolNames(names);

    expect(nameCheck.allValid).toBe(true);
    expect(annotationsCheck.valid).toBe(true);
    expect(annotationsCheck.missingAnnotations).toEqual([]);
    expect(annotationsCheck.invalidAnnotations).toEqual([]);

    // Ensure every tool publishes a JSON Schema object definition
    for (const tool of tools) {
      expect(tool.inputSchema).toBeTruthy();
      const schema = tool.inputSchema as any;
      expect(schema.type || schema['$schema']).toBeDefined();
      // Every schema we emit should at least expose a properties object (either directly or via $ref/definitions)
      expect(schema.properties || schema.definitions || schema.$ref).toBeDefined();
    }
  });
});
