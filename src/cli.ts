#!/usr/bin/env node

// CLI entry point for running the Autotask MCP server locally
// Loads environment configuration, initializes logging, and starts the server

import { AutotaskMcpServer } from './mcp/server.js';
import { Logger } from './utils/logger.js';
import { loadEnvironmentConfig, mergeWithMcpConfig } from './utils/config.js';

async function main() {
  let logger: Logger | undefined;
  let serverInstance: AutotaskMcpServer | undefined;

  try {
    // Load configuration
    const envConfig = loadEnvironmentConfig();
    const mcpConfig = mergeWithMcpConfig(envConfig);

    // Initialize logger
    logger = new Logger(envConfig.logging.level, envConfig.logging.format);

    if (envConfig.warnings.length > 0) {
      envConfig.warnings.forEach((warning) => logger!.warn(warning));
    }

    if (envConfig.errors.length > 0) {
      envConfig.errors.forEach((err) => logger!.error(err));
      throw new Error('Configuration validation failed. Please address the configuration errors above.');
    }

    logger.info('Starting Autotask MCP Server (CLI mode)...');
    logger.debug('Configuration loaded', {
      serverName: mcpConfig.name,
      serverVersion: mcpConfig.version,
      transportType: envConfig.transport.type,
      hasCredentials: !!(mcpConfig.autotask.username && mcpConfig.autotask.secret && mcpConfig.autotask.integrationCode)
    });

    // Validate required configuration
    const missingCredentials: string[] = [];
    if (!mcpConfig.autotask.username) {
      missingCredentials.push('AUTOTASK_USERNAME');
    }
    if (!mcpConfig.autotask.secret) {
      missingCredentials.push('AUTOTASK_SECRET');
    }
    if (!mcpConfig.autotask.integrationCode) {
      missingCredentials.push('AUTOTASK_INTEGRATION_CODE');
    }

    if (missingCredentials.length > 0) {
      throw new Error(`Missing required Autotask credentials: ${missingCredentials.join(', ')}.`);
    }

    // Create the MCP server (don't initialize Autotask yet)
    serverInstance = new AutotaskMcpServer(mcpConfig, logger, envConfig.transport);

    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      logger!.info('Received SIGINT, shutting down gracefully...');
      await serverInstance?.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger!.info('Received SIGTERM, shutting down gracefully...');
      await serverInstance?.stop();
      process.exit(0);
    });

    // Start the server using configured transports
    await serverInstance.start();

  } catch (error) {
    if (logger) {
      logger.error('Failed to start Autotask MCP Server:', error);
    } else {
      console.error('Failed to start Autotask MCP Server:', error);
    }
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server when executing via CLI
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
