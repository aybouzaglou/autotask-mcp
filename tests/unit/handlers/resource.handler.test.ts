// Resource Handler Tests - MCP Best Practices
// Tests validate proper resource pattern usage:
// - Resources are READ-ONLY
// - Resources provide specific entity context (not bulk searches)
// - listResources returns metadata only (no data fetching)
// - readResource requires specific IDs (no bulk operations)

import { AutotaskResourceHandler } from '../../../src/handlers/resource.handler.js';
import { AutotaskService } from '../../../src/services/autotask.service.js';
import { Logger } from '../../../src/utils/logger.js';

describe('AutotaskResourceHandler', () => {
  let handler: AutotaskResourceHandler;
  let mockAutotaskService: jest.Mocked<AutotaskService>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Create mock service
    mockAutotaskService = {
      getCompany: jest.fn(),
      getContact: jest.fn(),
      getTicket: jest.fn(),
      searchCompanies: jest.fn(),
      searchContacts: jest.fn(),
      searchTickets: jest.fn(),
    } as any;

    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    handler = new AutotaskResourceHandler(mockAutotaskService, mockLogger);
  });

  describe('listResources', () => {
    it('should return empty array (templates only, no concrete resources)', async () => {
      const resources = await handler.listResources();

      expect(resources).toEqual([]);
      expect(mockAutotaskService.searchCompanies).not.toHaveBeenCalled();
      expect(mockAutotaskService.searchContacts).not.toHaveBeenCalled();
      expect(mockAutotaskService.searchTickets).not.toHaveBeenCalled();
    });

    it('should not fetch any data from Autotask API', async () => {
      await handler.listResources();

      // Verify NO API calls were made
      expect(mockAutotaskService.getCompany).not.toHaveBeenCalled();
      expect(mockAutotaskService.getContact).not.toHaveBeenCalled();
      expect(mockAutotaskService.getTicket).not.toHaveBeenCalled();
      expect(mockAutotaskService.searchCompanies).not.toHaveBeenCalled();
      expect(mockAutotaskService.searchContacts).not.toHaveBeenCalled();
      expect(mockAutotaskService.searchTickets).not.toHaveBeenCalled();
    });

    it('should be fast (metadata only, no API calls)', async () => {
      const start = Date.now();
      await handler.listResources();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10); // Should complete in < 10ms
    });
  });

  describe('getResourceTemplates', () => {
    it('should return proper template structure with metadata', () => {
      const templates = handler.getResourceTemplates();

      expect(templates).toHaveLength(3);
      expect(templates).toEqual([
        {
          uriTemplate: 'autotask://companies/{id}',
          name: 'Company by ID',
          description: expect.stringContaining('company context'),
          mimeType: 'application/json',
        },
        {
          uriTemplate: 'autotask://contacts/{id}',
          name: 'Contact by ID',
          description: expect.stringContaining('contact context'),
          mimeType: 'application/json',
        },
        {
          uriTemplate: 'autotask://tickets/{id}',
          name: 'Ticket by ID',
          description: expect.stringContaining('ticket context'),
          mimeType: 'application/json',
        },
      ]);
    });

    it('should only include templates with {id} placeholders', () => {
      const templates = handler.getResourceTemplates();

      templates.forEach((template) => {
        expect(template.uriTemplate).toMatch(/\{id\}$/);
      });
    });

    it('should not include bulk list resources', () => {
      const templates = handler.getResourceTemplates();

      const templateStrings = templates.map((t) => t.uriTemplate);
      expect(templateStrings).not.toContain('autotask://companies');
      expect(templateStrings).not.toContain('autotask://contacts');
      expect(templateStrings).not.toContain('autotask://tickets');
      expect(templateStrings).not.toContain('autotask://time-entries');
    });
  });

  describe('readResource - Companies', () => {
    it('should read specific company by ID', async () => {
      const mockCompany = {
        id: 12345,
        companyName: 'Acme Corp',
        phone: '555-0100',
      };

      mockAutotaskService.getCompany.mockResolvedValue(mockCompany);

      const result = await handler.readResource('autotask://companies/12345');

      expect(result.uri).toBe('autotask://companies/12345');
      expect(result.mimeType).toBe('application/json');
      expect(result.text).toBeTruthy();

      const parsed = JSON.parse(result.text!);
      expect(parsed.data).toEqual(mockCompany);
      expect(parsed.description).toContain('Acme Corp');
      expect(parsed.metadata.resourceType).toBe('companies');
      expect(parsed.metadata.resourceId).toBe('12345');

      expect(mockAutotaskService.getCompany).toHaveBeenCalledWith(12345);
    });

    it('should reject bulk company list requests', async () => {
      await expect(handler.readResource('autotask://companies')).rejects.toThrow(
        /must include a specific ID/
      );

      expect(mockAutotaskService.searchCompanies).not.toHaveBeenCalled();
    });

    it('should handle company not found', async () => {
      mockAutotaskService.getCompany.mockResolvedValue(null);

      await expect(handler.readResource('autotask://companies/99999')).rejects.toThrow(
        /Company with ID 99999 not found/
      );
    });
  });

  describe('readResource - Contacts', () => {
    it('should read specific contact by ID', async () => {
      const mockContact = {
        id: 54321,
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@example.com',
      };

      mockAutotaskService.getContact.mockResolvedValue(mockContact);

      const result = await handler.readResource('autotask://contacts/54321');

      expect(result.uri).toBe('autotask://contacts/54321');
      expect(result.mimeType).toBe('application/json');

      const parsed = JSON.parse(result.text!);
      expect(parsed.data).toEqual(mockContact);
      expect(parsed.description).toContain('John Doe');
      expect(parsed.metadata.resourceType).toBe('contacts');
      expect(parsed.metadata.resourceId).toBe('54321');

      expect(mockAutotaskService.getContact).toHaveBeenCalledWith(54321);
    });

    it('should reject bulk contact list requests', async () => {
      await expect(handler.readResource('autotask://contacts')).rejects.toThrow(
        /must include a specific ID/
      );

      expect(mockAutotaskService.searchContacts).not.toHaveBeenCalled();
    });
  });

  describe('readResource - Tickets', () => {
    it('should read specific ticket by ID', async () => {
      const mockTicket = {
        id: 98765,
        ticketNumber: 'T20250001',
        title: 'Server down',
        status: 5,
      };

      mockAutotaskService.getTicket.mockResolvedValue(mockTicket);

      const result = await handler.readResource('autotask://tickets/98765');

      expect(result.uri).toBe('autotask://tickets/98765');
      expect(result.mimeType).toBe('application/json');

      const parsed = JSON.parse(result.text!);
      expect(parsed.data).toEqual(mockTicket);
      expect(parsed.description).toContain('Server down');
      expect(parsed.metadata.resourceType).toBe('tickets');
      expect(parsed.metadata.resourceId).toBe('98765');

      expect(mockAutotaskService.getTicket).toHaveBeenCalledWith(98765);
    });

    it('should reject bulk ticket list requests', async () => {
      await expect(handler.readResource('autotask://tickets')).rejects.toThrow(
        /must include a specific ID/
      );

      expect(mockAutotaskService.searchTickets).not.toHaveBeenCalled();
    });
  });

  describe('readResource - Time Entries', () => {
    it('should reject time-entry resources (not supported)', async () => {
      await expect(handler.readResource('autotask://time-entries/123')).rejects.toThrow(
        /Time entry resources by ID are not supported/
      );
    });

    it('should reject bulk time-entry list requests', async () => {
      await expect(handler.readResource('autotask://time-entries')).rejects.toThrow(
        /must include a specific ID/
      );
    });
  });

  describe('readResource - URI parsing', () => {
    it('should reject template URIs with {id} placeholder', async () => {
      await expect(handler.readResource('autotask://companies/{id}')).rejects.toThrow(
        /Template URI not supported for reading/
      );
    });

    it('should reject invalid URI format', async () => {
      await expect(handler.readResource('invalid://uri')).rejects.toThrow(
        /Invalid Autotask URI format/
      );
    });

    it('should reject URIs without autotask:// scheme', async () => {
      await expect(handler.readResource('companies/123')).rejects.toThrow(
        /Invalid Autotask URI format/
      );
    });

    it('should reject unknown resource types', async () => {
      await expect(handler.readResource('autotask://unknown/123')).rejects.toThrow(
        /Unknown resource type: unknown/
      );
    });
  });

  describe('MCP Best Practices Compliance', () => {
    it('should enforce that resources are read-only (no modification)', async () => {
      const mockCompany = { id: 123, companyName: 'Test' };
      mockAutotaskService.getCompany.mockResolvedValue(mockCompany);

      await handler.readResource('autotask://companies/123');

      // Verify only read operation was called
      expect(mockAutotaskService.getCompany).toHaveBeenCalledTimes(1);
    });

    it('should return deterministic results for same URI', async () => {
      const mockCompany = { id: 123, companyName: 'Test' };
      mockAutotaskService.getCompany.mockResolvedValue(mockCompany);

      const result1 = await handler.readResource('autotask://companies/123');
      const result2 = await handler.readResource('autotask://companies/123');

      const parsed1 = JSON.parse(result1.text!);
      const parsed2 = JSON.parse(result2.text!);

      expect(parsed1.data).toEqual(parsed2.data);
      expect(parsed1.metadata.resourceType).toEqual(parsed2.metadata.resourceType);
      expect(parsed1.metadata.resourceId).toEqual(parsed2.metadata.resourceId);
    });

    it('should provide context (what AI should KNOW), not actions (what AI can DO)', async () => {
      const templates = handler.getResourceTemplates();

      templates.forEach((template) => {
        // Descriptions should focus on context, not actions
        expect(template.description).toMatch(/context|details|provides/i);
        expect(template.description).not.toMatch(/search|create|update|delete/i);
      });
    });

    it('should guide users to tools for bulk operations', async () => {
      await expect(handler.readResource('autotask://companies')).rejects.toThrow(
        /use tools like search_companies/
      );
    });
  });
});
