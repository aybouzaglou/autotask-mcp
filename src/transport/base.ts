// Base Transport Interface
// Defines the contract for all MCP transport implementations

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export interface McpTransport {
  /**
   * Connect the server to this transport
   */
  connect(server: Server): Promise<void>;

  /**
   * Disconnect and cleanup
   */
  disconnect(): Promise<void>;

  /**
   * Get transport type identifier
   */
  getType(): string;

  /**
   * Check if transport is currently connected
   */
  isConnected(): boolean;
}

export abstract class BaseTransport implements McpTransport {
  protected connected: boolean = false;

  abstract connect(server: Server): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getType(): string;

  isConnected(): boolean {
    return this.connected;
  }
}