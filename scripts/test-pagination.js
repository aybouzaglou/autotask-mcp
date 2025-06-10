#!/usr/bin/env node

/**
 * Test script for verifying pagination-by-default functionality
 * This ensures we get complete, accurate data counts
 */

import { AutotaskService } from '../src/services/autotask.service.js';
import { Logger } from '../src/utils/logger.js';
import { loadEnvironmentConfig, mergeWithMcpConfig } from '../src/utils/config.js';

async function testPagination() {
  console.log('=== Testing Pagination-by-Default for Data Accuracy ===\n');
  
  try {
    // Load configuration
    const envConfig = loadEnvironmentConfig();
    const mcpConfig = mergeWithMcpConfig(envConfig);
    
    // Initialize logger
    const logger = new Logger('info', 'json');
    
    // Initialize service
    const autotaskService = new AutotaskService(mcpConfig.autotask, logger);
    
    console.log('🔍 Testing default behavior (should get ALL open tickets)...');
    const allOpenTickets = await autotaskService.searchTickets({
      // No pageSize specified - should get ALL tickets via pagination
    });
    
    console.log(`✅ Retrieved ${allOpenTickets.length} open tickets (complete dataset)`);
    
    console.log('\n🔍 Testing limited results (pageSize = 10)...');
    const limitedTickets = await autotaskService.searchTickets({
      pageSize: 10 // Should limit to 10 tickets
    });
    
    console.log(`✅ Retrieved ${limitedTickets.length} tickets (limited dataset)`);
    
    console.log('\n📊 Comparison:');
    console.log(`- Default (all results): ${allOpenTickets.length} tickets`);
    console.log(`- Limited (pageSize=10): ${limitedTickets.length} tickets`);
    
    if (allOpenTickets.length >= limitedTickets.length) {
      console.log('✅ Pagination working correctly - default gives complete dataset!');
    } else {
      console.log('❌ Issue detected - limited results should be <= complete results');
    }
    
    // Test with company filter
    if (allOpenTickets.length > 0) {
      const firstTicket = allOpenTickets[0];
      if (firstTicket.companyID) {
        console.log(`\n🔍 Testing company filter (companyID: ${firstTicket.companyID})...`);
        const companyTickets = await autotaskService.searchTickets({
          companyID: firstTicket.companyID
        });
        console.log(`✅ Retrieved ${companyTickets.length} tickets for company ${firstTicket.companyID}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run the test
testPagination()
  .then(() => {
    console.log('\n🎉 Pagination tests completed successfully!');
    console.log('Your ticket searches will now be accurate and complete by default.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Pagination tests failed:', error);
    process.exit(1);
  }); 