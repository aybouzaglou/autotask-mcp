/**
 * Test script for ID-to-Name mapping functionality
 * Demonstrates how to use the mapping service and enhanced tool handler
 */

import { AutotaskService } from '../src/services/autotask.service.js';
import { MappingService } from '../src/utils/mapping.service.js';
import { EnhancedAutotaskToolHandler } from '../src/handlers/enhanced.tool.handler.js';
import { Logger } from '../src/utils/logger.js';
import { loadEnvironmentConfig, mergeWithMcpConfig } from '../src/utils/config.js';

async function testMapping() {
  console.log('=== Testing Autotask ID-to-Name Mapping ===\n');
  
  try {
    // Load configuration
    const envConfig = loadEnvironmentConfig();
    const mcpConfig = mergeWithMcpConfig(envConfig);
    
    // Initialize logger
    const logger = new Logger('debug', 'json');
    
    // Initialize services
    const autotaskService = new AutotaskService(mcpConfig, logger);
    const mappingService = new MappingService(autotaskService, logger);
    const enhancedHandler = new EnhancedAutotaskToolHandler(autotaskService, logger);
    
    // Test connection first
    console.log('1. Testing Autotask connection...');
    const connected = await autotaskService.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Autotask API');
    }
    console.log('✓ Successfully connected to Autotask API\n');
    
    // Test basic mapping functionality
    console.log('2. Testing basic mapping functionality...');
    
    // Get a few companies to test with
    const companies = await autotaskService.searchCompanies({ pageSize: 5 });
    if (companies.length === 0) {
      console.log('No companies found to test with');
      return;
    }
    
    console.log(`Found ${companies.length} companies for testing:`);
    for (const company of companies) {
      console.log(`  - ID: ${company.id}, Name: ${company.companyName}`);
    }
    console.log('');
    
    // Test company name mapping
    console.log('3. Testing company name mapping...');
    const firstCompany = companies[0];
    if (firstCompany.id) {
      const companyResult = await mappingService.getCompanyName(firstCompany.id);
      console.log(`Company mapping result:`, companyResult);
    }
    console.log('');
    
    // Get a few resources to test with
    console.log('4. Testing resource mapping...');
    const resources = await autotaskService.searchResources({ pageSize: 5 });
    if (resources.length > 0) {
      console.log(`Found ${resources.length} resources for testing:`);
      for (const resource of resources) {
        console.log(`  - ID: ${resource.id}, Name: ${resource.firstName} ${resource.lastName}`);
      }
      
      const firstResource = resources[0];
      if (firstResource.id) {
        const resourceResult = await mappingService.getResourceName(firstResource.id);
        console.log(`Resource mapping result:`, resourceResult);
      }
    } else {
      console.log('No resources found to test with');
    }
    console.log('');
    
    // Test cache functionality
    console.log('5. Testing cache functionality...');
    console.log('Initial cache stats:', mappingService.getCacheStats());
    
    await mappingService.preloadCaches();
    console.log('Cache stats after preload:', mappingService.getCacheStats());
    console.log('');
    
    // Test enhanced tool handler
    console.log('6. Testing enhanced tool handler...');
    
    // Search for tickets and see enhanced results
    const ticketSearchResult = await enhancedHandler.callTool('search_tickets', { pageSize: 3 });
    
    if (!ticketSearchResult.isError) {
      const content = JSON.parse(ticketSearchResult.content[0].text);
      console.log('Enhanced ticket search results:');
      
      if (content.data && Array.isArray(content.data)) {
        for (let i = 0; i < Math.min(content.data.length, 2); i++) {
          const ticket = content.data[i];
          console.log(`\nTicket ${ticket.id}:`);
          console.log(`  - Title: ${ticket.title}`);
          console.log(`  - Company ID: ${ticket.companyID}`);
          console.log(`  - Assigned Resource ID: ${ticket.assignedResourceID}`);
          
          if (ticket._enhanced) {
            console.log('  Enhanced mappings:');
            if (ticket._enhanced.companyName) {
              console.log(`    - Company Name: ${ticket._enhanced.companyName}`);
            }
            if (ticket._enhanced.assignedResourceName) {
              console.log(`    - Assigned Resource Name: ${ticket._enhanced.assignedResourceName}`);
            }
          }
        }
      } else {
        console.log('No tickets found or unexpected data structure');
      }
    } else {
      console.log('Error in enhanced search:', ticketSearchResult.content[0].text);
    }
    
    console.log('\n=== Mapping tests completed successfully! ===');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMapping().catch(console.error);
}

export { testMapping }; 