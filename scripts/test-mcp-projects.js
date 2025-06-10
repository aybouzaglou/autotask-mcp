#!/usr/bin/env node

/**
 * Test script to validate the MCP server's search_projects tool functionality
 * This tests the actual MCP protocol flow, not just the service directly
 */

const { config } = require('dotenv');
const { AutotaskMcpServer } = require('../dist/mcp/server.js');
const { Logger } = require('../dist/utils/logger.js');
const { loadEnvironmentConfig, mergeWithMcpConfig } = require('../dist/utils/config.js');
const winston = require('winston');

// Load environment variables
config();

async function testMcpProjectsSearch() {
  console.log('🔍 Testing MCP Server search_projects tool...\n');

  // Check for required environment variables
  const requiredVars = ['AUTOTASK_USERNAME', 'AUTOTASK_SECRET', 'AUTOTASK_INTEGRATION_CODE'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease set these variables and try again.');
    console.error('Example:');
    console.error('   export AUTOTASK_USERNAME="your-api-user@company.com"');
    console.error('   export AUTOTASK_SECRET="your-secret-key"');
    console.error('   export AUTOTASK_INTEGRATION_CODE="your-integration-code"');
    process.exit(1);
  }

  try {
    // Load configuration exactly as the main server does
    const envConfig = loadEnvironmentConfig();
    const mcpConfig = mergeWithMcpConfig(envConfig);
    
    // Initialize logger
    const logger = new Logger(envConfig.logging.level, envConfig.logging.format);
    
    console.log('📡 Initializing MCP Server...');
    
    // Create the MCP server instance
    const server = new AutotaskMcpServer(mcpConfig, logger);
    
    console.log('✅ MCP Server created successfully');
    
    // Test 1: List tools to see if search_projects is available
    console.log('\n🔧 Test 1: Checking if search_projects tool is available...');
    
    // Access the tool handler directly for testing
    const toolHandler = server.toolHandler || server.autotaskService;
    
    if (server.toolHandler && typeof server.toolHandler.listTools === 'function') {
      const tools = await server.toolHandler.listTools();
      const searchProjectsTool = tools.find(tool => tool.name === 'search_projects');
      
      if (searchProjectsTool) {
        console.log('✅ search_projects tool found in MCP server');
        console.log(`   Description: ${searchProjectsTool.description}`);
      } else {
        console.log('❌ search_projects tool not found');
        console.log('Available tools:', tools.map(t => t.name).join(', '));
        process.exit(1);
      }
    } else {
      console.log('⚠️  Cannot access tool handler directly, will test via call');
    }
    
    // Test 2: Call the search_projects tool
    console.log('\n🔧 Test 2: Calling search_projects tool...');
    
    if (server.toolHandler && typeof server.toolHandler.callTool === 'function') {
      try {
        const result = await server.toolHandler.callTool('search_projects', {
          pageSize: 3,
          searchTerm: '' // Empty search to get any projects
        });
        
        if (result.isError) {
          console.error('❌ Tool call returned error:', result.content);
          
          // Check if it's the old "type" field error
          if (result.content && result.content.some && 
              result.content.some(c => c.text && c.text.includes('Unable to find type in the Project Entity'))) {
            console.error('\n💡 This is the old field name error - the fix may not be compiled yet.');
            console.error('   Try running: npm run build');
          } else if (result.content && result.content.some && 
                    result.content.some(c => c.text && c.text.includes('405'))) {
            console.error('\n💡 Getting 405 error - this is a permissions issue, not our bug.');
            console.error('   Check API user permissions in Autotask.');
          }
        } else {
          console.log('✅ search_projects tool call succeeded!');
          
          // Parse the result
          let projects = [];
          if (result.content && result.content[0] && result.content[0].text) {
            try {
              const parsed = JSON.parse(result.content[0].text);
              projects = parsed.projects || parsed || [];
            } catch (e) {
              console.log('Result content:', result.content[0].text);
            }
          }
          
          console.log(`📊 Retrieved ${projects.length} projects`);
          
          if (projects.length > 0) {
            console.log('📋 Sample project data:');
            const sample = projects[0];
            console.log({
              id: sample.id,
              projectName: sample.projectName,
              projectType: sample.projectType, // This should now work with the fix
              status: sample.status,
              companyID: sample.companyID
            });
            
            // Verify the fix worked
            if (sample.projectType !== undefined) {
              console.log('✅ SUCCESS: projectType field is present - the fix worked!');
            } else {
              console.log('⚠️  projectType field missing, but no error occurred');
            }
          }
        }
      } catch (error) {
        console.error('❌ Tool call failed:', error.message);
        
        if (error.message.includes('Unable to find type in the Project Entity')) {
          console.error('\n💡 This is the old field name error we fixed.');
          console.error('   Make sure you ran: npm run build');
        } else if (error.message.includes('405')) {
          console.error('\n💡 Getting 405 error - this is a permissions issue.');
          console.error('   Check API user permissions in Autotask.');
        }
      }
    } else {
      console.log('❌ Cannot access tool handler for testing');
    }
    
    console.log('\n🎯 Test completed');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testMcpProjectsSearch().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});