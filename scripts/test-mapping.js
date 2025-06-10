#!/usr/bin/env node

/**
 * Standalone test script for the mapping functionality
 * Can be run independently to test ID-to-name resolution
 */

import { testMapping } from '../tests/mapping.test.js';

console.log('Running Autotask ID-to-Name Mapping Tests...\n');

testMapping()
  .then(() => {
    console.log('\nAll tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTests failed:', error);
    process.exit(1);
  }); 