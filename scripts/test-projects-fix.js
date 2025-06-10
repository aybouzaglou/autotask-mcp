#!/usr/bin/env node

/**
 * Test script to verify the Projects search fix
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

async function testProjectsSearch() {
  console.log('🔍 Testing Projects Search Fix...\n');

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
    // Initialize the service
    await autotaskService.initialize();
    console.log('✅ Service initialized successfully\n');

    // Test 1: Search projects with pageSize limit
    console.log('🧪 Test 1: Search projects with pageSize=5...');
    const limitedProjects = await autotaskService.searchProjects({
      pageSize: 5
    });
    console.log(`✅ Retrieved ${limitedProjects.length} projects (limited)`);
    if (limitedProjects.length > 0) {
      console.log('📋 Sample project:', {
        id: limitedProjects[0].id,
        name: limitedProjects[0].projectName,
        companyID: limitedProjects[0].companyID,
        status: limitedProjects[0].status
      });
    }
    console.log('');

    // Test 2: Search projects with filter
    console.log('🧪 Test 2: Search projects with filter (status >= 1)...');
    const filteredProjects = await autotaskService.searchProjects({
      filter: [
        {
          field: 'status',
          op: 'gte',
          value: 1
        }
      ],
      pageSize: 3
    });
    console.log(`✅ Retrieved ${filteredProjects.length} filtered projects`);
    console.log('');

    // Test 3: Search projects without any filters (default)
    console.log('🧪 Test 3: Search projects with default settings...');
    const defaultProjects = await autotaskService.searchProjects({
      pageSize: 10
    });
    console.log(`✅ Retrieved ${defaultProjects.length} projects (default)`);
    console.log('');

    console.log('🎉 All tests passed! Projects search is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

async function testSimpleProjectsEndpoint() {
  console.log('🔍 Testing simple Projects endpoint access...\n');

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

    // First, let's test the direct client access to see what endpoints are available
    console.log('🔍 Testing direct API access to Projects endpoint...');
    
    const client = await autotaskService.ensureClient();
    
    try {
      // Try a simple GET to the Projects entity information endpoint  
      const entityInfoResponse = await client.axios.get('/Projects/entityInformation');
      console.log('✅ Projects entity info retrieved successfully');
      console.log('Entity info:', JSON.stringify(entityInfoResponse.data, null, 2));
    } catch (entityError) {
      console.log('❌ Projects entity info failed:', entityError.response?.data || entityError.message);
    }

    try {
      // Try a simple Projects query to see exact error
      const simpleQuery = {
        filter: [
          {
            "op": "gte",
            "field": "id", 
            "value": 0
          }
        ],
        pageSize: 1
      };
      
      console.log('🔍 Testing simple Projects/query...');
      const queryResponse = await client.axios.post('/Projects/query', simpleQuery);
      console.log('✅ Projects query succeeded!');
      console.log('Response:', JSON.stringify(queryResponse.data, null, 2));
    } catch (queryError) {
      console.log('❌ Projects query failed:', queryError.response?.data || queryError.message);
      console.log('Status:', queryError.response?.status);
      console.log('Headers:', queryError.response?.headers);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testProjectsSearch()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

testSimpleProjectsEndpoint(); 