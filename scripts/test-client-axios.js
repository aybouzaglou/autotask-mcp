#!/usr/bin/env node

/**
 * Test script to examine client object structure
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

async function examineClientStructure() {
  console.log('🔍 Examining client object structure...\n');

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
    // Initialize and get client
    await autotaskService.initialize();
    const client = await autotaskService.ensureClient();
    
    console.log('📋 Client object properties:');
    console.log('  Keys:', Object.keys(client));
    
    // Check for axios property
    if (client.axios) {
      console.log('✅ Found axios property');
      console.log('  Axios properties:', Object.keys(client.axios));
    } else {
      console.log('❌ No axios property found');
    }
    
    // Check what properties exist
    console.log('\n📋 Available properties:');
    Object.keys(client).forEach(key => {
      const value = client[key];
      console.log(`  ${key}: ${typeof value} ${Array.isArray(value) ? '(array)' : ''}`);
    });
    
    // Test both working companies and broken projects
    console.log('\n🧪 Testing direct API calls...');
    
    // Test 1: Working Companies call
    console.log('\n1️⃣ Testing Companies (known working):');
    try {
      if (client.axios && typeof client.axios.post === 'function') {
        const companiesResponse = await client.axios.post('/Companies/query', {
          filter: [{ op: "gte", field: "id", value: 0 }],
          includeFields: ["id", "companyName"],
          pageSize: 1
        });
        console.log('   ✅ Companies query SUCCESS');
        console.log('   📊 Response format:', {
          dataType: typeof companiesResponse.data,
          hasItems: !!companiesResponse.data?.items,
          itemCount: companiesResponse.data?.items?.length || 0
        });
      } else {
        console.log('   ❌ client.axios.post not available');
      }
    } catch (error) {
      console.log('   ❌ Companies query FAILED:', error.message);
    }
    
    // Test 2: Projects call (the problematic one)
    console.log('\n2️⃣ Testing Projects (problematic):');
    try {
      if (client.axios && typeof client.axios.post === 'function') {
        const projectsResponse = await client.axios.post('/Projects/query', {
          filter: [{ op: "gte", field: "id", value: 0 }],
          includeFields: ["id", "projectName"],
          pageSize: 1
        });
        console.log('   ✅ Projects query SUCCESS');
        console.log('   📊 Response format:', {
          dataType: typeof projectsResponse.data,
          hasItems: !!projectsResponse.data?.items,
          itemCount: projectsResponse.data?.items?.length || 0
        });
      } else {
        console.log('   ❌ client.axios.post not available');
      }
    } catch (error) {
      console.log('   ❌ Projects query FAILED:', error.response?.status, error.response?.statusText);
      console.log('   📋 Error details:', error.response?.data?.errors || error.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to examine client:', error.message);
  }
}

// Run the test
examineClientStructure().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}); 