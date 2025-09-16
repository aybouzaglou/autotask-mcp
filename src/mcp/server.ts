// Main MCP Server Implementation
// Handles the Model Context Protocol server setup and integration with Autotask

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { AutotaskService } from '../services/autotask.service.js';
import { Logger } from '../utils/logger.js';
import { McpServerConfig } from '../types/mcp.js';
import { AutotaskResourceHandler } from '../handlers/resource.handler.js';
import { EnhancedAutotaskToolHandler } from '../handlers/enhanced.tool.handler.js';
import { McpTransport, TransportFactory, TransportConfig } from '../transport/index.js';

export class AutotaskMcpServer {
  private server: Server;
  private autotaskService: AutotaskService;
  private resourceHandler: AutotaskResourceHandler;
  private toolHandler: EnhancedAutotaskToolHandler;
  private logger: Logger;
  private transports: McpTransport[] = [];
  private transportFactory: TransportFactory;
  private defaultTransportConfig: TransportConfig | undefined;

  constructor(config: McpServerConfig, logger: Logger, transportConfig?: TransportConfig) {
    this.logger = logger;

    // Initialize transport factory (transports created on start)
    this.transportFactory = new TransportFactory(logger);
    this.defaultTransportConfig = transportConfig;

    // Initialize the MCP server
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          resources: {
            subscribe: false,
            listChanged: true
          },
          tools: {
            listChanged: true
          }
        },
        instructions: this.getServerInstructions()
      }
    );

    // Initialize Autotask service
    this.autotaskService = new AutotaskService(config, logger);
    
    // Initialize handlers
    this.resourceHandler = new AutotaskResourceHandler(this.autotaskService, logger);
    this.toolHandler = new EnhancedAutotaskToolHandler(this.autotaskService, logger);

    this.setupHandlers();
  }

  /**
   * Set up all MCP request handlers
   */
  private setupHandlers(): void {
    this.logger.info('Setting up MCP request handlers...');

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        this.logger.debug('Handling list resources request');
        const resources = await this.resourceHandler.listResources();
        return { resources };
      } catch (error) {
        this.logger.error('Failed to list resources:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list resources: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Read a specific resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        this.logger.debug(`Handling read resource request for: ${request.params.uri}`);
        const content = await this.resourceHandler.readResource(request.params.uri);
        return { contents: [content] };
      } catch (error) {
        this.logger.error(`Failed to read resource ${request.params.uri}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        this.logger.debug('Handling list tools request');
        const tools = await this.toolHandler.listTools();
        return { tools };
      } catch (error) {
        this.logger.error('Failed to list tools:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Call a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        this.logger.debug(`Handling tool call: ${request.params.name}`);
        const result = await this.toolHandler.callTool(
          request.params.name,
          request.params.arguments || {}
        );
        return {
          content: result.content,
          isError: result.isError
        };
      } catch (error) {
        this.logger.error(`Failed to call tool ${request.params.name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to call tool: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    this.logger.info('MCP request handlers set up successfully');
  }

  /**
   * Start the MCP server with configured transports
   */
  async start(transportConfig?: TransportConfig): Promise<void> {
    this.logger.info('Starting Autotask MCP Server...');

    const effectiveTransportConfig = transportConfig ?? this.defaultTransportConfig;
    if (!effectiveTransportConfig) {
      throw new Error('No transport configuration provided. Unable to start Autotask MCP Server.');
    }

    const configToUse: TransportConfig = effectiveTransportConfig;
    this.defaultTransportConfig = configToUse;
    this.transports = this.transportFactory.createTransports(configToUse);

    // Set up error handling
    this.server.onerror = (error) => {
      this.logger.error('MCP Server error:', error);
    };

    // Set up initialization callback
    this.server.oninitialized = () => {
      this.logger.info('MCP Server initialized and ready to serve requests');
    };

    // Connect to all configured transports
    for (const transport of this.transports) {
      this.logger.info(`Connecting to ${transport.getType()} transport...`);
      await transport.connect(this.server);
      this.logger.info(`Successfully connected to ${transport.getType()} transport`);
    }

    this.logger.info(`Autotask MCP Server started with ${this.transports.length} transport(s)`);
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Autotask MCP Server...');

    // Disconnect from all transports
    for (const transport of this.transports) {
      this.logger.info(`Disconnecting from ${transport.getType()} transport...`);
      await transport.disconnect();
    }

    await this.server.close();
    this.logger.info('Autotask MCP Server stopped');

    this.transports = [];
  }

  /**
   * Get server instructions for clients
   */
  private getServerInstructions(): string {
    return `
# Autotask MCP Server

This server provides access to Kaseya Autotask PSA data and operations through the Model Context Protocol.

## Available Resources:
- **autotask://companies/{id}** - Get company details by ID
- **autotask://companies** - List all companies
- **autotask://contacts/{id}** - Get contact details by ID  
- **autotask://contacts** - List all contacts
- **autotask://tickets/{id}** - Get ticket details by ID
- **autotask://tickets** - List all tickets

## Available Tools:
- **search_companies** - Search for companies with filters
- **create_company** - Create a new company
- **update_company** - Update company information
- **search_contacts** - Search for contacts with filters
- **create_contact** - Create a new contact
- **update_contact** - Update contact information
- **search_tickets** - Search for tickets with filters
- **create_ticket** - Create a new ticket
- **update_ticket** - Update ticket information
- **create_time_entry** - Log time against a ticket or project
- **test_connection** - Test Autotask API connectivity

## ID-to-Name Mapping Tools:
- **get_company_name** - Get company name by ID
- **get_resource_name** - Get resource name by ID
- **get_mapping_cache_stats** - Get mapping cache statistics
- **clear_mapping_cache** - Clear mapping cache
- **preload_mapping_cache** - Preload mapping cache for better performance

## Enhanced Features:
All search and detail tools automatically include human-readable names for company and resource IDs in the enhanced field of each result.

## Authentication:
This server requires valid Autotask API credentials. Ensure you have:
- AUTOTASK_USERNAME (API user email)
- AUTOTASK_SECRET (API secret key)
- AUTOTASK_INTEGRATION_CODE (integration code)

For more information, visit: https://github.com/your-org/autotask-mcp
`.trim();
  }

  /**
   * Expose the underlying MCP Server instance for external transports
   */
  getServer(): Server {
    return this.server;
  }
}
