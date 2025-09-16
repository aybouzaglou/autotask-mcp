// Transport Factory
// Creates transport instances based on configuration

import { McpTransport } from './base.js';
import { StdioTransport } from './stdio.js';
import { HttpTransport, HttpTransportConfig } from './http.js';
import { Logger } from '../utils/logger.js';

export type TransportType = 'stdio' | 'http' | 'both';

export interface TransportConfig {
  type: TransportType;
  http?: HttpTransportConfig;
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
        if (!config.http) {
          throw new Error('HTTP transport configuration is required');
        }
        transports.push(new HttpTransport(config.http, this.logger));
        this.logger.info('Created HTTP transport');
        break;

      case 'both':
        transports.push(new StdioTransport());
        this.logger.info('Created stdio transport');
        if (!config.http) {
          throw new Error('HTTP transport configuration is required for both mode');
        }
        transports.push(new HttpTransport(config.http, this.logger));
        this.logger.info('Created HTTP transport');
        break;

      default:
        throw new Error(`Unknown transport type: ${config.type}`);
    }

    return transports;
  }
}
