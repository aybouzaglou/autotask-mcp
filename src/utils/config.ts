// Configuration Utility
// Handles loading configuration from environment variables and MCP client arguments

import { McpServerConfig } from '../types/mcp.js';
import { LogLevel } from './logger.js';
import { TransportConfig, TransportType } from '../transport/index.js';

export interface EnvironmentConfig {
  autotask: {
    username?: string;
    secret?: string;
    integrationCode?: string;
    apiUrl?: string;
  };
  server: {
    name: string;
    version: string;
  };
  logging: {
    level: LogLevel;
    format: 'json' | 'simple';
  };
  transport: TransportConfig;
  warnings: string[];
  errors: string[];
}
/**
 * Load configuration from environment variables
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  const autotaskConfig: { username?: string; secret?: string; integrationCode?: string; apiUrl?: string } = {};
  const warnings: string[] = [];
  const errors: string[] = [];

  if (process.env.AUTOTASK_USERNAME) {
    autotaskConfig.username = process.env.AUTOTASK_USERNAME;
  }
  if (process.env.AUTOTASK_SECRET) {
    autotaskConfig.secret = process.env.AUTOTASK_SECRET;
  }
  if (process.env.AUTOTASK_INTEGRATION_CODE) {
    autotaskConfig.integrationCode = process.env.AUTOTASK_INTEGRATION_CODE;
  }
  if (process.env.AUTOTASK_API_URL) {
    autotaskConfig.apiUrl = process.env.AUTOTASK_API_URL;
  }

  const validTransportTypes: TransportType[] = ['stdio', 'http', 'both'];
  const rawTransportType = process.env.AUTOTASK_TRANSPORT?.trim();
  let transportType: TransportType = 'stdio';

  if (rawTransportType && rawTransportType.length > 0) {
    const normalizedTransport = rawTransportType.toLowerCase() as TransportType;
    if (validTransportTypes.includes(normalizedTransport)) {
      transportType = normalizedTransport;
    } else {
      errors.push(
        `AUTOTASK_TRANSPORT="${rawTransportType}" is not supported. Valid options: ${validTransportTypes.join(', ')}.`
      );
    }
  }

  const rawHttpPort = process.env.AUTOTASK_HTTP_PORT;
  let httpPort = 3000;
  if (rawHttpPort && rawHttpPort.length > 0) {
    const parsedPort = Number.parseInt(rawHttpPort, 10);
    if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      errors.push(`AUTOTASK_HTTP_PORT="${rawHttpPort}" must be an integer between 1 and 65535.`);
    } else {
      httpPort = parsedPort;
    }
  }

  const httpHost = process.env.AUTOTASK_HTTP_HOST?.trim() || (transportType === 'stdio' ? 'localhost' : '0.0.0.0');
  if (httpHost.length === 0) {
    errors.push('AUTOTASK_HTTP_HOST cannot be an empty string.');
  }

  const rawHttpAuth = process.env.AUTOTASK_HTTP_AUTH?.trim();
  let httpAuthEnabled = false;
  if (rawHttpAuth && rawHttpAuth.length > 0) {
    const normalized = rawHttpAuth.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      httpAuthEnabled = true;
    } else if (['false', '0', 'no', 'off'].includes(normalized)) {
      httpAuthEnabled = false;
    } else {
      errors.push(`AUTOTASK_HTTP_AUTH="${rawHttpAuth}" must be one of: true, false, 1, 0, yes, no, on, off.`);
    }
  }

  const httpAuthUsername = process.env.AUTOTASK_HTTP_USERNAME;
  const httpAuthPassword = process.env.AUTOTASK_HTTP_PASSWORD;

  if (httpAuthEnabled) {
    if (!httpAuthUsername) {
      errors.push('AUTOTASK_HTTP_USERNAME is required when AUTOTASK_HTTP_AUTH is enabled.');
    }
    if (!httpAuthPassword) {
      errors.push('AUTOTASK_HTTP_PASSWORD is required when AUTOTASK_HTTP_AUTH is enabled.');
    }
  } else if (transportType !== 'stdio' && (httpAuthUsername || httpAuthPassword)) {
    warnings.push('HTTP auth credentials detected but AUTOTASK_HTTP_AUTH is not enabled. They will be ignored.');
  } else if ((transportType === 'http' || transportType === 'both') && !httpAuthEnabled) {
    warnings.push('HTTP transport selected without AUTOTASK_HTTP_AUTH enabled. For self-hosted deployments, enable auth or ensure external protections are in place.');
  }

  if (transportType === 'stdio' && (rawHttpPort || process.env.AUTOTASK_HTTP_HOST || rawHttpAuth)) {
    warnings.push('HTTP transport settings detected but AUTOTASK_TRANSPORT is set to "stdio". HTTP configuration will be ignored.');
  }

  const httpConfig = {
    port: httpPort,
    host: httpHost,
    auth: {
      enabled: httpAuthEnabled,
      ...(httpAuthEnabled
        ? {
            username: httpAuthUsername!,
            password: httpAuthPassword!
          }
        : {})
    }
  };

  return {
    autotask: autotaskConfig,
    server: {
      name: process.env.MCP_SERVER_NAME || 'autotask-mcp',
      version: process.env.MCP_SERVER_VERSION || '1.0.0'
    },
    logging: {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      format: (process.env.LOG_FORMAT as 'json' | 'simple') || 'simple'
    },
    transport: {
      type: transportType,
      ...(transportType === 'http' || transportType === 'both' ? { http: httpConfig } : {})
    },
    warnings,
    errors
  };
}

/**
 * Merge environment config with MCP client configuration
 */
export function mergeWithMcpConfig(envConfig: EnvironmentConfig, mcpArgs?: Record<string, any>): McpServerConfig {
  // MCP client can override server configuration through arguments
  const serverConfig: McpServerConfig = {
    name: mcpArgs?.name || envConfig.server.name,
    version: mcpArgs?.version || envConfig.server.version,
    autotask: {
      username: mcpArgs?.autotask?.username || envConfig.autotask.username,
      secret: mcpArgs?.autotask?.secret || envConfig.autotask.secret,
      integrationCode: mcpArgs?.autotask?.integrationCode || envConfig.autotask.integrationCode,
      apiUrl: mcpArgs?.autotask?.apiUrl || envConfig.autotask.apiUrl
    }
  };

  return serverConfig;
}

/**
 * Validate that all required configuration is present
 */
export function validateConfig(config: McpServerConfig): string[] {
  const errors: string[] = [];

  if (!config.autotask.username) {
    errors.push('AUTOTASK_USERNAME is required');
  }

  if (!config.autotask.secret) {
    errors.push('AUTOTASK_SECRET is required');
  }

  if (!config.autotask.integrationCode) {
    errors.push('AUTOTASK_INTEGRATION_CODE is required');
  }

  if (!config.name) {
    errors.push('Server name is required');
  }

  if (!config.version) {
    errors.push('Server version is required');
  }

  return errors;
}

/**
 * Get configuration help text
 */
export function getConfigHelp(): string {
  return `
Autotask MCP Server Configuration:

Required Environment Variables:
  AUTOTASK_USERNAME         - Autotask API username (email)
  AUTOTASK_SECRET          - Autotask API secret key
  AUTOTASK_INTEGRATION_CODE - Autotask integration code

Optional Environment Variables:
  AUTOTASK_API_URL         - Autotask API base URL (auto-detected if not provided)
  MCP_SERVER_NAME          - Server name (default: autotask-mcp)
  MCP_SERVER_VERSION       - Server version (default: 1.0.0)
  LOG_LEVEL                - Logging level: error, warn, info, debug (default: info)
  LOG_FORMAT               - Log format: simple, json (default: simple)

Transport Configuration:
  AUTOTASK_TRANSPORT       - Transport type: stdio, http, both (default: stdio)
  AUTOTASK_HTTP_PORT       - HTTP port (default: 3000)
  AUTOTASK_HTTP_HOST       - HTTP host (default: localhost)
  AUTOTASK_HTTP_AUTH       - Enable HTTP auth: true, false (default: false)
  AUTOTASK_HTTP_USERNAME   - HTTP auth username
  AUTOTASK_HTTP_PASSWORD   - HTTP auth password

Example:
  AUTOTASK_USERNAME=api-user@example.com
  AUTOTASK_SECRET=your-secret-key
  AUTOTASK_INTEGRATION_CODE=your-integration-code
`.trim();
}
