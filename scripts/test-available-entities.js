#!/usr/bin/env node

/**
 * Test script to check what entities are available in this Autotask instance
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

async function testAvailableEntities() {
  console.log('🔍 Testing available entities in this Autotask instance...\n');

  // Create the service
  const serviceConfig = {
    autotask: {
      username: process.env.AUTOTASK_USERNAME,
      secret: process.env.AUTOTASK_SECRET,
      integrationCode: process.env.AUTOTASK_INTEGRATION_CODE
    }
  };

  if (!serviceConfig.autotask.username || !serviceConfig.autotask.secret || !serviceConfig.autotask.integrationCode) {
    console.error('❌ Missing required environment variables:');
    console.error('   AUTOTASK_USERNAME:', !!serviceConfig.autotask.username);
    console.error('   AUTOTASK_SECRET:', !!serviceConfig.autotask.secret);
    console.error('   AUTOTASK_INTEGRATION_CODE:', !!serviceConfig.autotask.integrationCode);
    process.exit(1);
  }

  const autotaskService = new AutotaskService(serviceConfig, logger);

  // Test different entity endpoints to see which ones work
  const entitiesToTest = [
    'Companies',      // Known working
    'Contacts',       // Known working  
    'Projects',       // The problematic one
    'Tasks',          // Might work
    'Tickets',        // Should work
    'Resources',      // Known to have issues
    'Accounts',       // Alternative name for Companies?
    'TimeEntries',    // Should work
    'Opportunities',  // Might work
  ];

  const results = {};

  for (const entityName of entitiesToTest) {
    console.log(`\n🧪 Testing ${entityName} entity...`);
    
    try {
      // Test entity information endpoint first
      console.log(`   📋 Testing ${entityName}/entityInformation...`);
      const autotaskService = new AutotaskService(serviceConfig, logger);
      const client = await autotaskService.ensureClient();
      
      const entityInfoResponse = await client.axios.get(`/${entityName}/entityInformation`);
      console.log(`   ✅ ${entityName} entity info: SUCCESS`);
      results[entityName] = { entityInfo: 'SUCCESS' };
      
      // Test a simple query
      console.log(`   🔍 Testing ${entityName}/query...`);
      const queryResponse = await client.axios.post(`/${entityName}/query`, {
        filter: [
          {
            op: "gte",
            field: "id", 
            value: 0
          }
        ],
        includeFields: ["id"],
        MaxRecords: 1
      });
      console.log(`   ✅ ${entityName} query: SUCCESS (${queryResponse.data.items?.length || 0} records)`);
      results[entityName].query = 'SUCCESS';
      
    } catch (error) {
      console.log(`   ❌ ${entityName}: FAILED`);
      console.log(`      Error: ${error.response?.status} ${error.response?.statusText}`);
      console.log(`      Message: ${error.response?.data?.errors?.[0] || error.message}`);
      results[entityName] = { 
        error: error.response?.status || 'UNKNOWN',
        message: error.response?.data?.errors?.[0] || error.message
      };
    }
  }

  console.log('\n📊 SUMMARY OF AVAILABLE ENTITIES:');
  console.log('=====================================');
  
  Object.entries(results).forEach(([entity, result]) => {
    if (result.query === 'SUCCESS') {
      console.log(`✅ ${entity}: FULLY WORKING`);
    } else if (result.entityInfo === 'SUCCESS') {
      console.log(`⚠️  ${entity}: ENTITY EXISTS, QUERY FAILED`);
    } else {
      console.log(`❌ ${entity}: NOT AVAILABLE (${result.error}: ${result.message})`);
    }
  });
}

// Run the test
testAvailableEntities().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}); 