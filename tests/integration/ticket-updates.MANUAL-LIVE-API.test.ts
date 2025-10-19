// Integration Tests: Ticket Update Reliability
// Tests for ticket assignment, status, priority updates and note creation
// NOTE: These tests connect to the REAL Autotask API using credentials from .env

import { AutotaskService } from '../../src/services/autotask.service';
import { AutotaskToolHandler } from '../../src/handlers/tool.handler';
import { Logger } from '../../src/utils/logger';
import { McpServerConfig } from '../../src/types/mcp';

const parseResponse = (response: any) => {
  const text = response.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('Expected textual content in tool response');
  }
  return JSON.parse(text);
};

// Skip these tests if Autotask credentials are not available
const hasCredentials =
  process.env.AUTOTASK_USERNAME && process.env.AUTOTASK_SECRET && process.env.AUTOTASK_INTEGRATION_CODE;

const describeIfCredentials = hasCredentials ? describe : describe.skip;

describeIfCredentials('Ticket Update Reliability - Integration Tests [LIVE API]', () => {
  let autotaskService: AutotaskService;
  let toolHandler: AutotaskToolHandler;
  let logger: Logger;

  beforeAll(async () => {
    // RATE LIMIT PROTECTION: Add 2-second delay to avoid hammering API
    // If you're getting 401 errors, wait 60+ seconds between test runs
    console.warn('⚠️  RATE LIMIT WARNING: Waiting 2 seconds before connecting...');
    console.warn('⚠️  If tests fail with 401, your account may be locked.');
    console.warn('⚠️  Wait 60+ seconds before re-running tests.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const apiUrl = process.env.AUTOTASK_API_URL;
    const config: McpServerConfig = {
      name: 'integration-test',
      version: '1.0.0',
      autotask: {
        username: process.env.AUTOTASK_USERNAME!,
        secret: process.env.AUTOTASK_SECRET!,
        integrationCode: process.env.AUTOTASK_INTEGRATION_CODE!,
        ...(apiUrl && { apiUrl }),
      },
    };

    logger = new Logger('info');
    autotaskService = new AutotaskService(config, logger);
    toolHandler = new AutotaskToolHandler(autotaskService, logger);

    // Initialize connection and metadata cache
    // Note: This may take 30+ seconds on first connection
    await autotaskService.initialize();
  }, 60000); // 60 second timeout for initialization

  afterAll(() => {
    // Stop metadata cache refresh timer to allow Jest to exit
    autotaskService.getMetadataCache().stop();
  });

  describe('Setup: Connection and Metadata', () => {
    // Skip connection test to avoid extra API call that could trigger rate limiting
    it.skip('should connect to Autotask API successfully', async () => {
      const connected = await autotaskService.testConnection();
      expect(connected).toBe(true);
    });

    it('should have loaded metadata cache with statuses', () => {
      const cache = autotaskService.getMetadataCache();
      const statuses = cache.getAllStatuses();
      expect(statuses.length).toBeGreaterThan(0);
      expect(cache.isValidStatus(1)).toBe(true); // Status 'New' should exist
    });

    it('should have loaded metadata cache with priorities', () => {
      const cache = autotaskService.getMetadataCache();
      const priorities = cache.getAllPriorities();
      expect(priorities.length).toBeGreaterThan(0);
      expect(cache.isValidPriority(1)).toBe(true); // Priority 'Low' should exist
    });

    it('should have loaded active resources', () => {
      const cache = autotaskService.getMetadataCache();
      const resources = cache.getAllResources();
      // May be 0 if resources endpoint fails, but cache should be accessible
      expect(resources).toBeInstanceOf(Array);
    });
  });

  describe('US1: Ticket Field Updates (Assignment, Status, Priority)', () => {
    describe('Validation (without API calls)', () => {
      it('should reject invalid status codes before API call', async () => {
        const response = await toolHandler.callTool('autotask_update_ticket', {
          ticketId: 12345, // Doesn't matter, validation happens first
          status: 9999, // Invalid status
        });

        expect(response.isError).toBe(true);
        const content = parseResponse(response);
        expect(content.error.code).toBe('VALIDATION_ERROR');
        expect(content.error.guidance).toContain('Invalid status');
      });

      it('should reject invalid priority codes before API call', async () => {
        const response = await toolHandler.callTool('autotask_update_ticket', {
          ticketId: 12345,
          priority: 9999, // Invalid priority
        });

        expect(response.isError).toBe(true);
        const content = parseResponse(response);
        expect(content.error.code).toBe('VALIDATION_ERROR');
        expect(content.error.guidance).toContain('Invalid priority');
      });

      it('should reject updates with no fields', async () => {
        const response = await toolHandler.callTool('autotask_update_ticket', {
          ticketId: 12345,
        });

        expect(response.isError).toBe(true);
        const content = parseResponse(response);
        expect(content.error.code).toBe('VALIDATION_ERROR');
        expect(content.error.guidance).toContain('At least one field must be provided');
      });
    });

    describe('Combined field updates', () => {
      it.todo('should update ticket assignment, status, and priority in a single call');
      // NOTE: Actual ticket update tests should use a dedicated test ticket ID

      it.todo('should handle resource assignment changes');
      it.todo('should validate status transitions');
      it.todo('should validate priority updates');
    });
  });

  describe('US2: Ticket Note Creation (Internal and External)', () => {
    it.todo('should create internal note with publish=1');
    it.todo('should create external note with publish=3');
    it.todo('should enforce length limits on notes');
    it.todo('should reject notes with invalid publish levels');
    it.todo('should require description for notes');
  });

  describe('US3: Actionable Error Responses', () => {
    it('should provide actionable guidance for invalid status', async () => {
      // This is already tested above in validation tests
      const response = await toolHandler.callTool('autotask_update_ticket', {
        ticketId: 12345,
        status: 9999,
      });
      const content = parseResponse(response);
      expect(content.error.correlationId).toBeDefined();
      expect(content.error.correlationId).toMatch(/^ERR-/);
    });

    it.todo('should provide actionable guidance for permission errors');
    it.todo('should log sanitized ticket metadata on errors');
    it.todo('should not leak sensitive data in logs');
  });
});
