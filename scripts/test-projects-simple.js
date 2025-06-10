#!/usr/bin/env node

/**
 * Simple test script to diagnose Projects endpoint issues
 */

const { config } = require('dotenv');
const { AutotaskService } = require('../dist/services/autotask.service.js');
const winston = require('winston');

// Load environment variables
config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

async function testProjectsEndpoint() {
  console.log('🔍 Testing Projects endpoint issues...\n');

  // Create the service
  const serviceConfig = {
    autotask: {
      username: process.env.AUTOTASK_USERNAME,
      secret: process.env.AUTOTASK_SECRET,
      integrationCode: process.env.AUTOTASK_INTEGRATION_CODE
    }
  };

  const autotaskService = new AutotaskService(serviceConfig, logger);

  try {
    console.log('📡 Initializing service...');
    await autotaskService.initialize();
    console.log('✅ Service initialized successfully\n');

    // Test 1: Simple search projects call to get exact error
    console.log('🔍 Test 1: Simple searchProjects call...');
    try {
      const projects = await autotaskService.searchProjects({ pageSize: 1 });
      console.log('✅ Projects search succeeded!');
      console.log(`Found ${projects.length} projects`);
      if (projects.length > 0) {
        console.log('First project:', JSON.stringify(projects[0], null, 2));
      }
    } catch (error) {
      console.log('❌ Projects search failed:', error.message);
      console.log('Status:', error.response?.status);
      console.log('Response data:', JSON.stringify(error.response?.data, null, 2));
    }

    // Test 2: Compare with working companies endpoint
    console.log('\n🔍 Test 2: Compare with working companies...');
    try {
      const companies = await autotaskService.searchCompanies({ pageSize: 1 });
      console.log('✅ Companies search works!');
      console.log(`Found ${companies.length} companies`);
    } catch (error) {
      console.log('❌ Companies search also failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
}

testProjectsEndpoint()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }); 