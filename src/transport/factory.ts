// Transport Factory
// Creates transport instances based on configuration

import { McpTransport } from './base';
import { StdioTransport } from './stdio';
import { Logger } from '../utils/logger';

export type TransportType = 'stdio' | 'http' | 'both';

export interface TransportConfig {
  type: TransportType;
  http?: {
    port: number;
    host: string;
    auth?: {
      enabled: boolean;
      username?: string;
      password?: string;
    };
  };
}

export class TransportFactory {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  createTransports(config: TransportConfig): McpTransport[] {
    const transports: McpTransport[] = [];

    switch (config.type) {
      case 'stdio':
        transports.push(new StdioTransport());
        this.logger.info('Created stdio transport');
        break;

      case 'http':
        // HTTP transport will be implemented in Story 1.3
        throw new Error('HTTP transport not yet implemented (coming in Story 1.3)');

      case 'both':
        transports.push(new StdioTransport());
        this.logger.info('Created stdio transport');
        // HTTP transport will be added in Story 1.3
        throw new Error('HTTP transport not yet implemented (coming in Story 1.3)');

      default:
        throw new Error(`Unknown transport type: ${config.type}`);
    }

    return transports;
  }
}