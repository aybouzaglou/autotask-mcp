#!/usr/bin/env ts-node
/**
 * Validation script to ensure all tools have proper MCP annotations
 */

import { AutotaskToolHandler } from './src/handlers/tool.handler.js';
import { AutotaskService } from './src/services/autotask.service.js';
import { Logger } from './src/utils/logger.js';
import { validateAllToolAnnotations } from './src/utils/validation/tool-annotations.js';
import { validateAllToolNames } from './src/utils/validation/tool-name.validator.js';

async function main() {
  console.log('Validating tool annotations...\n');

  // Create minimal instances just to list tools
  const logger = new Logger('debug');
  const config = {
    username: 'test',
    secret: 'test',
    integrationCode: 'test',
    baseUrl: 'https://test.autotask.net',
  };
  const autotaskService = new AutotaskService(config, logger);
  const handler = new AutotaskToolHandler(autotaskService, logger);

  // Get all tools
  const tools = await handler.listTools();
  console.log(`Found ${tools.length} tools\n`);

  // Validate tool names
  const toolNames = tools.map((t) => t.name);
  const nameValidation = validateAllToolNames(toolNames);

  if (!nameValidation.allValid) {
    console.error('❌ Tool name validation FAILED:');
    console.error(`   Invalid names: ${nameValidation.invalid.join(', ')}\n`);
  } else {
    console.log(`✓ All ${nameValidation.valid.length} tool names are valid\n`);
  }

  // Validate annotations
  const annotationValidation = validateAllToolAnnotations(tools);

  if (!annotationValidation.valid) {
    console.error('❌ Tool annotation validation FAILED:\n');

    if (annotationValidation.missingAnnotations.length > 0) {
      console.error(`Missing annotations (${annotationValidation.missingAnnotations.length} tools):`);
      annotationValidation.missingAnnotations.forEach((name) => {
        console.error(`  - ${name}`);
      });
      console.error('');
    }

    if (annotationValidation.invalidAnnotations.length > 0) {
      console.error(`Invalid annotations (${annotationValidation.invalidAnnotations.length} tools):`);
      annotationValidation.invalidAnnotations.forEach(({ toolName, errors }) => {
        console.error(`  - ${toolName}:`);
        errors.forEach((err) => console.error(`    * ${err}`));
      });
      console.error('');
    }

    process.exit(1);
  }

  console.log(`✓ All ${tools.length} tools have valid annotations\n`);

  // Summary by annotation type
  const readOnly = tools.filter((t) => t.annotations?.readOnlyHint === true);
  const create = tools.filter(
    (t) => t.annotations?.readOnlyHint === false && t.name.includes('create')
  );
  const update = tools.filter(
    (t) => t.annotations?.readOnlyHint === false && t.name.includes('update')
  );
  const test = tools.filter((t) => t.name.includes('test'));

  console.log('Annotation summary:');
  console.log(`  - Read-only tools: ${readOnly.length}`);
  console.log(`  - Create tools: ${create.length}`);
  console.log(`  - Update tools: ${update.length}`);
  console.log(`  - Test tools: ${test.length}\n`);

  console.log('✅ All validation checks passed!');
}

main().catch((error) => {
  console.error('Validation script error:', error);
  process.exit(1);
});
