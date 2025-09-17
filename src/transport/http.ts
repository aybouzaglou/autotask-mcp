// Experimental HTTP transport implementation.
// Smithery-hosted deployments already expose Streamable HTTP; this listener exists
// strictly for self-hosted experimentation and is not production ready.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { BaseTransport } from './base.js';
import { Logger } from '../utils/logger.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';

export interface HttpTransportConfig {
  port: number;
  host: string;
  auth?: {
    enabled: boolean;
    username?: string;
    password?: string;
  };
}

export class HttpTransport extends BaseTransport {
  private config: HttpTransportConfig;
  private httpServer: any;
  private logger: Logger;

  constructor(config: HttpTransportConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async connect(_server: Server): Promise<void> {
    this.logger.warn('HTTP transport is experimental and intended for self-hosted scenarios only.');

    return new Promise((resolve, reject) => {
      try {
        this.httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
          // Set CORS headers for browser compatibility
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }

          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed. Use POST for MCP requests.' }));
            return;
          }

          // Basic auth check if enabled
          if (this.config.auth?.enabled) {
            const auth = req.headers.authorization;
            if (!auth || !this.validateAuth(auth)) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Authentication required' }));
              return;
            }
          }

          // Handle MCP request
          try {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });

            req.on('end', async () => {
              try {
                const mcpRequest = JSON.parse(body);
                this.logger.debug('Received HTTP MCP request', { method: mcpRequest.method });

                // This is a simplified HTTP transport - in a full implementation,
                // we would need to properly handle the MCP protocol over HTTP
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  id: mcpRequest.id,
                  result: { message: 'MCP HTTP transport is running' }
                }));

              } catch (error) {
                this.logger.error('Error processing MCP request:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON request' }));
              }
            });

          } catch (error) {
            this.logger.error('Error handling HTTP request:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });

        this.httpServer.listen(this.config.port, this.config.host, () => {
          this.connected = true;
          this.logger.info(`HTTP transport listening on ${this.config.host}:${this.config.port}`);
          resolve();
        });

        this.httpServer.on('error', (error: Error) => {
          this.logger.error('HTTP server error:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.httpServer && this.connected) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          this.connected = false;
          this.logger.info('HTTP transport disconnected');
          resolve();
        });
      });
    }
  }

  getType(): string {
    return 'http';
  }

  private validateAuth(authHeader: string): boolean {
    if (!this.config.auth?.username || !this.config.auth?.password) {
      return false;
    }

    const expectedAuth = Buffer.from(`${this.config.auth.username}:${this.config.auth.password}`).toString('base64');
    const providedAuth = authHeader.replace('Basic ', '');

    return providedAuth === expectedAuth;
  }
}
