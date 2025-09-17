#!/usr/bin/env node

// Ticket Patch Tool Smoke Test
// Usage: node scripts/test-ticket-update.js <ticketId> field=value [...]

import process from 'node:process';

import { AutotaskService } from '../dist/services/autotask.service.js';
import { AutotaskToolHandler } from '../dist/handlers/tool.handler.js';
import { Logger } from '../dist/utils/logger.js';
import { loadEnvironmentConfig, mergeWithMcpConfig } from '../dist/utils/config.js';

const [, , rawTicketId, ...fieldArgs] = process.argv;

if (!rawTicketId) {
  console.error('Usage: node scripts/test-ticket-update.js <ticketId> field=value [...]');
  process.exit(1);
}

const ticketId = Number(rawTicketId);
if (!Number.isFinite(ticketId)) {
  console.error(`ticketId must be numeric. Received: ${rawTicketId}`);
  process.exit(1);
}

if (fieldArgs.length === 0) {
  console.error('Provide at least one field=value pair to patch (e.g., status=5 description="Updated by smoke").');
  process.exit(1);
}

const parseValue = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && value.trim() !== '') {
    return asNumber;
  }

  return value;
};

const updates = fieldArgs.reduce((accumulator, segment) => {
  const [key, ...valueParts] = segment.split('=');
  if (!key || valueParts.length === 0) {
    return accumulator;
  }

  const value = valueParts.join('=');
  accumulator[key] = parseValue(value);
  return accumulator;
}, {});

if (Object.keys(updates).length === 0) {
  console.error('Parsed zero updates – double-check the field=value arguments.');
  process.exit(1);
}

const logger = new Logger('info', 'simple');
logger.setLevel('info');

async function run() {
  const envConfig = loadEnvironmentConfig();
  const mcpConfig = mergeWithMcpConfig(envConfig);

  const service = new AutotaskService(mcpConfig, logger);
  const handler = new AutotaskToolHandler(service, logger);

  const payload = { ticketId, ...updates };
  logger.info('[ticket-update-smoke] Calling update_ticket', payload);

  const response = await handler.callTool('update_ticket', payload);
  const firstBlock = response.content?.[0]?.text ?? '';

  if (response.isError) {
    console.error('[ticket-update-smoke] update_ticket failed:', firstBlock);
    process.exitCode = 1;
    return;
  }

  console.log('[ticket-update-smoke] Success:', firstBlock);
}

run().catch((error) => {
  console.error('[ticket-update-smoke] Unexpected failure:', error);
  process.exitCode = 1;
});
