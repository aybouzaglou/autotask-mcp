#!/usr/bin/env node

/**
 * Test script to verify the projectType field fix
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

async function testProjectTypeFieldFix() {
  console.log('🔍 Testing projectType field fix...\n');

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
    console.log('🚀 Testing searchProjects with fixed projectType field...');
    
    const projects = await autotaskService.searchProjects({
      pageSize: 3 // Small test size
    });
    
    console.log('✅ SUCCESS! The projectType field fix resolved the issue.');
    console.log(`📊 Retrieved ${projects.length} projects`);
    
    if (projects.length > 0) {
      console.log('📋 Sample project data:');
      console.log({
        id: projects[0].id,
        projectName: projects[0].projectName,
        projectType: projects[0].projectType,
        status: projects[0].status,
        companyID: projects[0].companyID
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('  Status:', error.response?.status);
    console.error('  Response:', error.response?.data?.errors || error.message);
    
    if (error.response?.status === 500 && error.response?.data?.errors?.includes('Unable to find type in the Project Entity.')) {
      console.error('\n💡 The field name fix did not resolve the issue. There may be additional problems.');
    } else if (error.response?.status === 405) {
      console.error('\n💡 Getting 405 error - this may be a permissions or endpoint configuration issue.');
    }
  }
}

// Run the test
testProjectTypeFieldFix().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});