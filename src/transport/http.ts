// Streamable HTTP transport implementation.
// Provides a specification-compliant HTTP transport suitable for Smithery deployments
// and other remote MCP client connections.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { createServer, IncomingMessage, ServerResponse, Server as HttpServer } from 'http';

import { BaseTransport } from './base.js';
import { Logger } from '../utils/logger.js';

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
  private httpServer: HttpServer | undefined;
  private transport: StreamableHTTPServerTransport | undefined;
  private logger: Logger;

  constructor(config: HttpTransportConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async connect(server: Server): Promise<void> {
    if (this.connected) {
      this.logger.warn('HTTP transport is already connected');
      return;
    }

    this.transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string | undefined) => {
        if (sessionId) {
          this.logger.info(`Initialized MCP HTTP session ${sessionId}`);
        } else {
          this.logger.info('Initialized stateless MCP HTTP session');
        }
      },
      onsessionclosed: (sessionId: string | undefined) => {
        if (sessionId) {
          this.logger.info(`Closed MCP HTTP session ${sessionId}`);
        }
      },
    });

    this.transport.onerror = (error: Error) => {
      this.logger.error('Streamable HTTP transport error:', error);
    };

    await server.connect(this.transport);

    this.httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        this.addCorsHeaders(res);

        if (req.method === 'OPTIONS') {
          res.writeHead(204).end();
          return;
        }

        if (this.config.auth?.enabled && !this.isAuthorized(req.headers.authorization)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Authentication required' }));
          return;
        }

        await this.transport!.handleRequest(req, res);
      } catch (error) {
        this.logger.error('Failed to handle HTTP request:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        } else {
          res.end();
        }
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer!.once('error', (error: Error) => {
        this.logger.error('HTTP server failed to start:', error);
        reject(error);
      });

      this.httpServer!.listen(this.config.port, this.config.host, () => {
        this.connected = true;
        this.logger.info(`HTTP transport listening on ${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await Promise.all([
      new Promise<void>((resolve) => {
        if (!this.httpServer) {
          resolve();
          return;
        }
        this.httpServer.close(() => resolve());
      }),
      (async () => {
        if (this.transport) {
          await this.transport.close();
        }
      })(),
    ]);

    this.httpServer = undefined;
    this.transport = undefined;
    this.connected = false;
    this.logger.info('HTTP transport disconnected');
  }

  getType(): string {
    return 'http';
  }

  private isAuthorized(authHeader?: string): boolean {
    if (!this.config.auth?.enabled) {
      return true;
    }

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    if (!this.config.auth?.username || !this.config.auth?.password) {
      return false;
    }

    const expectedAuth = Buffer.from(`${this.config.auth.username}:${this.config.auth.password}`).toString('base64');
    const providedAuth = authHeader.replace('Basic ', '');

    return providedAuth === expectedAuth;
  }

  private addCorsHeaders(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id');
  }
}
