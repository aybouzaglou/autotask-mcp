#!/usr/bin/env node

/**
 * Test script specifically for the searchProjects method
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

async function testSearchProjects() {
  console.log('🔍 Testing searchProjects method...\n');

  // Create the service
  const serviceConfig = {
    autotask: {
      username: process.env.AUTOTASK_USERNAME,
      secret: process.env.AUTOTASK_SECRET,
      integrationCode: process.env.AUTOTASK_INTEGRATION_CODE
    }
  };

  if (!serviceConfig.autotask.username || !serviceConfig.autotask.secret || !serviceConfig.autotask.integrationCode) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const autotaskService = new AutotaskService(serviceConfig, logger);

  try {
    console.log('📋 Testing searchProjects with default options...');
    const projects = await autotaskService.searchProjects();
    console.log(`✅ SUCCESS: Found ${projects.length} projects`);
    
    if (projects.length > 0) {
      console.log('📄 Sample project:');
      console.log(JSON.stringify(projects[0], null, 2));
    }

    console.log('\n📋 Testing searchProjects with search term...');
    const filteredProjects = await autotaskService.searchProjects({
      searchTerm: 'test',
      pageSize: 5
    });
    console.log(`✅ SUCCESS: Found ${filteredProjects.length} projects matching "test"`);

    console.log('\n📋 Testing searchProjects with specific company...');
    const companyProjects = await autotaskService.searchProjects({
      companyID: 0, // Root company
      pageSize: 10
    });
    console.log(`✅ SUCCESS: Found ${companyProjects.length} projects for company 0`);

  } catch (error) {
    console.error('❌ searchProjects failed:');
    console.error('  Status:', error.response?.status);
    console.error('  Message:', error.response?.data?.errors?.[0] || error.message);
    console.error('  Full error:', error.response?.data || error.message);
  }
}

// Run the test
testSearchProjects().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}); 