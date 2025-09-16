// Smithery entry point: exports config schema and createServer factory.
// This file is consumed by the Smithery CLI to instantiate the MCP server.

import { z } from 'zod';
import { AutotaskMcpServer } from './mcp/server.js';
import { Logger } from './utils/logger.js';
import { McpServerConfig } from './types/mcp.js';
import { TransportConfig } from './transport/index.js';

const DEFAULT_SERVER_NAME = process.env.npm_package_name ?? 'autotask-mcp';
const DEFAULT_SERVER_VERSION = process.env.npm_package_version ?? '1.0.0';

export const configSchema = z.object({
  serverName: z.string().default(DEFAULT_SERVER_NAME).describe('Name reported to MCP clients'),
  serverVersion: z.string().default(DEFAULT_SERVER_VERSION).describe('Semantic version reported to clients'),
  autotaskUsername: z.string().min(1).describe('Autotask API username (email)'),
  autotaskSecret: z.string().min(1).describe('Autotask API secret key'),
  autotaskIntegrationCode: z.string().min(1).describe('Autotask integration code'),
  autotaskApiUrl: z.string().url().optional().describe('Optional Autotask API base URL override'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info').describe('Logging level for server output'),
  logFormat: z.enum(['simple', 'json']).default('simple').describe('Logging format for server output'),
  transport: z.enum(['stdio', 'http', 'both']).default('http').describe('Transport(s) to enable for this server instance'),
  httpHost: z.string().default('0.0.0.0').describe('HTTP host for HTTP transport'),
  httpPort: z.number().int().min(1).max(65535).default(3000).describe('HTTP port for HTTP transport'),
  httpAuthEnabled: z.boolean().default(false).describe('Enable HTTP basic authentication'),
  httpAuthUsername: z.string().optional().describe('HTTP basic auth username (required when auth enabled)'),
  httpAuthPassword: z.string().optional().describe('HTTP basic auth password (required when auth enabled)')
}).refine(
  (value) => {
    if ((value.transport === 'http' || value.transport === 'both') && value.httpAuthEnabled) {
      return Boolean(value.httpAuthUsername && value.httpAuthPassword);
    }
    return true;
  },
  {
    message: 'HTTP authentication requires both username and password when enabled',
    path: ['httpAuthUsername']
  }
);

export type AutotaskSmitheryConfig = z.infer<typeof configSchema>;

interface CreateServerArgs {
  config: AutotaskSmitheryConfig;
}

function buildTransportConfig(parsed: AutotaskSmitheryConfig): TransportConfig {
  const needsHttp = parsed.transport === 'http' || parsed.transport === 'both';
  const transportConfig: TransportConfig = { type: parsed.transport };

  if (needsHttp) {
    const authConfig = parsed.httpAuthEnabled
      ? {
          enabled: true,
          username: parsed.httpAuthUsername!,
          password: parsed.httpAuthPassword!
        }
      : { enabled: false };

    transportConfig.http = {
      host: parsed.httpHost,
      port: parsed.httpPort,
      auth: authConfig
    };
  }

  return transportConfig;
}

function buildMcpConfig(parsed: AutotaskSmitheryConfig): McpServerConfig {
  return {
    name: parsed.serverName,
    version: parsed.serverVersion,
    autotask: {
      username: parsed.autotaskUsername,
      secret: parsed.autotaskSecret,
      integrationCode: parsed.autotaskIntegrationCode,
      ...(parsed.autotaskApiUrl ? { apiUrl: parsed.autotaskApiUrl } : {})
    }
  };
}

export default function createServer({ config }: CreateServerArgs) {
  const parsed = configSchema.parse(config);

  const logger = new Logger(parsed.logLevel, parsed.logFormat);
  logger.info('Initializing Autotask MCP server via Smithery runtime...');

  const mcpConfig = buildMcpConfig(parsed);
  const transportConfig = buildTransportConfig(parsed);

  const server = new AutotaskMcpServer(mcpConfig, logger, transportConfig);
  return server.getServer();
}
