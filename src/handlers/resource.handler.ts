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
   * FUTURE: Resource Change Notifications
   * 
   * MCP best practice: Notify clients when resources change.
   * To implement, add notification methods that call:
   * - server.notification({ method: 'notifications/resources/updated', params: { uri } })
   * 
   * Trigger these notifications when:
   * - update_company tool modifies a company → notify autotask://companies/{id}
   * - update_ticket tool modifies a ticket → notify autotask://tickets/{id}
   * - create_contact tool adds a contact → notify parent resource if applicable
   * 
   * This requires:
   * 1. Reference to MCP Server instance in handler
   * 2. Tool handlers calling resource handler notification methods
   * 3. Clients subscribing to resource URIs they're tracking
   */

  /**
   * List all available resource templates (metadata only, no data fetching)
   * Resources are READ-ONLY context for specific entities, not bulk searches.
   * For searches/lists, use tools (search_companies, search_tickets, etc.)
   */
  async listResources(): Promise<McpResource[]> {
    this.logger.debug('Listing available Autotask resource templates');

    // Return only template metadata - no data fetching at this stage
    // Resources provide specific entity context when the AI needs details about a known entity
    const resources: McpResource[] = [];

    this.logger.debug(`Listed ${resources.length} concrete resources (templates available via listResourceTemplates)`);
    return resources;
  }

  /**
   * Read a specific resource by URI
   * Resources provide READ-ONLY context for specific entities.
   * Bulk searches/lists should use tools, not resources.
   */
  async readResource(uri: string): Promise<McpResourceContent> {
    this.logger.debug(`Reading resource: ${uri}`);

    // Parse the URI to determine the resource type and ID
    const { resourceType, resourceId } = this.parseUri(uri);

    // Resources REQUIRE a specific ID - no bulk operations
    if (!resourceId) {
      throw new Error(
        `Resource URI must include a specific ID. Got: ${uri}. ` +
        `For searching/listing, use tools like search_${resourceType} instead.`
      );
    }

    let data: any;
    let description: string;

    switch (resourceType) {
      case 'companies':
        data = await this.autotaskService.getCompany(parseInt(resourceId, 10));
        if (!data) {
          throw new Error(`Company with ID ${resourceId} not found`);
        }
        description = `Company: ${data.companyName || 'Unknown'}`;
        break;

      case 'contacts':
        data = await this.autotaskService.getContact(parseInt(resourceId, 10));
        if (!data) {
          throw new Error(`Contact with ID ${resourceId} not found`);
        }
        description = `Contact: ${data.firstName} ${data.lastName}`;
        break;

      case 'tickets':
        data = await this.autotaskService.getTicket(parseInt(resourceId, 10));
        if (!data) {
          throw new Error(`Ticket with ID ${resourceId} not found`);
        }
        description = `Ticket: ${data.title || data.ticketNumber || 'Unknown'}`;
        break;

      case 'time-entries':
        // Time entries don't have a direct getById method, so we reject
        throw new Error(
          `Time entry resources by ID are not supported. Use search_time_entries tool instead.`
        );

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
          resourceId
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
   * Get available resource templates for dynamic URI construction
   * Templates allow clients to construct URIs for specific entities
   */
  getResourceTemplates(): Array<{ uriTemplate: string; name: string; description: string; mimeType: string }> {
    return [
      {
        uriTemplate: 'autotask://companies/{id}',
        name: 'Company by ID',
        description: 'Get specific company context by ID. Provides full company details for a known company.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'autotask://contacts/{id}',
        name: 'Contact by ID',
        description: 'Get specific contact context by ID. Provides full contact details for a known contact.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'autotask://tickets/{id}',
        name: 'Ticket by ID',
        description: 'Get specific ticket context by ID. Provides full ticket details including status, priority, and description.',
        mimeType: 'application/json'
      }
    ];
  }
} 