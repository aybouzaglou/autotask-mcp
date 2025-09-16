// Stdio Transport Implementation
// Wraps the existing stdio transport in the new abstraction

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BaseTransport } from './base.js';

export class StdioTransport extends BaseTransport {
  private transport: StdioServerTransport;

  constructor() {
    super();
    this.transport = new StdioServerTransport();
  }

  async connect(server: Server): Promise<void> {
    await server.connect(this.transport);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    // StdioServerTransport doesn't have explicit disconnect
    // Connection is closed when server.close() is called
    this.connected = false;
  }

  getType(): string {
    return 'stdio';
  }
}