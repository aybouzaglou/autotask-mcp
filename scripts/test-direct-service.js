#!/usr/bin/env node

/**
 * Direct test of the AutotaskService.searchProjects method
 */

const { config } = require('dotenv');
const { AutotaskService } = require('../dist/services/autotask.service.js');
const winston = require('winston');

// Load environment variables
config();

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

async function testServiceSearchProjects() {
  console.log('🔍 Testing AutotaskService.searchProjects method directly...\n');

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
    console.log('🚀 Calling searchProjects with small pageSize...');
    
    const projects = await autotaskService.searchProjects({
      pageSize: 5
    });
    
    console.log('✅ SUCCESS! Retrieved projects:');
    console.log(`📊 Count: ${projects.length}`);
    
    if (projects.length > 0) {
      console.log('📋 First project:');
      console.log('   ID:', projects[0].id);
      console.log('   Name:', projects[0].projectName);
      console.log('   Status:', projects[0].status);
    }
    
  } catch (error) {
    console.log('❌ FAILED with error:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.errors || error.message);
    console.log('   Full error:', error.response?.data);
  }
}

// Run the test
testServiceSearchProjects().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}); 