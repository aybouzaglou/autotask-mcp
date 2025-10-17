// Autotask Resource Handler
// Handles MCP resource requests for read-only access to Autotask data

import { AutotaskService } from '../services/autotask.service.js';
import { Logger } from '../utils/logger.js';

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

export class AutotaskResourceHandler {
  private autotaskService: AutotaskService;
  private logger: Logger;

  constructor(autotaskService: AutotaskService, logger: Logger) {
    this.autotaskService = autotaskService;
    this.logger = logger;
  }

  /**
   * List all available resources
   */
  async listResources(): Promise<McpResource[]> {
    this.logger.debug('Listing available Autotask resources');

    const resources: McpResource[] = [
      // Company resources
      {
        uri: 'autotask://companies',
        name: 'Companies (Limited)',
        description: 'Returns ONLY FIRST 100 companies. For complete searches with filters, use the search_companies TOOL instead.',
        mimeType: 'application/json'
      },
      {
        uri: 'autotask://companies/{id}',
        name: 'Company by ID',
        description: 'Get specific company details by ID',
        mimeType: 'application/json'
      },

      // Contact resources
      {
        uri: 'autotask://contacts',
        name: 'Contacts (Limited)',
        description: 'Returns ONLY FIRST 100 contacts. For complete searches with filters, use the search_contacts TOOL instead.',
        mimeType: 'application/json'
      },
      {
        uri: 'autotask://contacts/{id}',
        name: 'Contact by ID',
        description: 'Get specific contact details by ID',
        mimeType: 'application/json'
      },

      // Ticket resources
      {
        uri: 'autotask://tickets',
        name: 'Tickets (Limited)',
        description: 'Returns ONLY FIRST 100 tickets. For complete searches with filters, use the search_tickets TOOL instead.',
        mimeType: 'application/json'
      },
      {
        uri: 'autotask://tickets/{id}',
        name: 'Ticket by ID',
        description: 'Get specific ticket details by ID',
        mimeType: 'application/json'
      },

      // Time entry resources
      {
        uri: 'autotask://time-entries',
        name: 'Time Entries',
        description: 'List of time entries in Autotask',
        mimeType: 'application/json'
      }
    ];

    this.logger.debug(`Listed ${resources.length} available resources`);
    return resources;
  }

  /**
   * Read a specific resource by URI
   */
  async readResource(uri: string): Promise<McpResourceContent> {
    this.logger.debug(`Reading resource: ${uri}`);

    // Parse the URI to determine the resource type and ID
    const { resourceType, resourceId } = this.parseUri(uri);

    let data: any;
    let description: string;

    switch (resourceType) {
      case 'companies':
        if (resourceId) {
          data = await this.autotaskService.getCompany(parseInt(resourceId, 10));
          if (!data) {
            throw new Error(`Company with ID ${resourceId} not found`);
          }
          description = `Company: ${data.companyName || 'Unknown'}`;
        } else {
          data = await this.autotaskService.searchCompanies({ pageSize: 100 });
          description = `⚠️ Showing first ${data.length} companies only (limited to 100). Use search_companies tool with pageSize: -1 for complete results.`;
        }
        break;

      case 'contacts':
        if (resourceId) {
          data = await this.autotaskService.getContact(parseInt(resourceId, 10));
          if (!data) {
            throw new Error(`Contact with ID ${resourceId} not found`);
          }
          description = `Contact: ${data.firstName} ${data.lastName}`;
        } else {
          data = await this.autotaskService.searchContacts({ pageSize: 100 });
          description = `⚠️ Showing first ${data.length} contacts only (limited to 100). Use search_contacts tool with pageSize: -1 for complete results.`;
        }
        break;

      case 'tickets':
        if (resourceId) {
          data = await this.autotaskService.getTicket(parseInt(resourceId, 10));
          if (!data) {
            throw new Error(`Ticket with ID ${resourceId} not found`);
          }
          description = `Ticket: ${data.title || data.ticketNumber || 'Unknown'}`;
        } else {
          data = await this.autotaskService.searchTickets({ pageSize: 100 });
          description = `⚠️ Showing first ${data.length} tickets only (limited to 100). Use search_tickets tool with pageSize: -1 for complete results.`;
        }
        break;

      case 'time-entries':
        data = await this.autotaskService.getTimeEntries({ pageSize: 100 });
        description = `⚠️ Showing first ${data.length} time entries only (limited to 100). Use appropriate tool for complete results.`;
        break;

      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }

    const content: McpResourceContent = {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({
        description,
        uri,
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          resourceType,
          resourceId: resourceId || null,
          count: Array.isArray(data) ? data.length : 1
        }
      }, null, 2)
    };

    this.logger.debug(`Successfully read resource: ${uri}`);
    return content;
  }

  /**
   * Parse a resource URI to extract type and ID
   */
  private parseUri(uri: string): { resourceType: string; resourceId?: string } {
    const match = uri.match(/^autotask:\/\/([^/]+)(?:\/(.+))?$/);
    
    if (!match) {
      throw new Error(`Invalid Autotask URI format: ${uri}`);
    }

    const [, resourceType, resourceId] = match;

    // Handle template URIs like "companies/{id}"
    if (resourceId === '{id}') {
      throw new Error(`Template URI not supported for reading: ${uri}. Please provide a specific ID.`);
    }

    return {
      resourceType,
      resourceId
    };
  }

  /**
   * Get available resource templates for documentation
   */
  getResourceTemplates(): string[] {
    return [
      'autotask://companies',
      'autotask://companies/{id}',
      'autotask://contacts',
      'autotask://contacts/{id}',
      'autotask://tickets',
      'autotask://tickets/{id}',
      'autotask://time-entries'
    ];
  }
} 