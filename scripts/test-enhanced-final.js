// Final Enhanced Tool Handler Test
// This script tests the complete enhanced functionality including ticket search with name mappings

async function testEnhancedToolHandler() {
  console.log('🎯 Testing Enhanced Tool Handler (Final Test)...\n');
  
  try {
    // Import modules from dist directory
    const { AutotaskService } = await import('../dist/services/autotask.service.js');
    const { EnhancedAutotaskToolHandler } = await import('../dist/handlers/enhanced.tool.handler.js');
    const { Logger } = await import('../dist/utils/logger.js');
    const { loadEnvironmentConfig, mergeWithMcpConfig } = await import('../dist/utils/config.js');

    console.log('📊 Loading configuration...');
    const envConfig = loadEnvironmentConfig();
    const mcpConfig = mergeWithMcpConfig(envConfig);
    
    // Use simple logging
    const logger = new Logger('info', 'simple');
    
    console.log('🔧 Initializing services...');
    const autotaskService = new AutotaskService(mcpConfig, logger);
    
    // Test connection first
    console.log('🔌 Testing connection...');
    const connectionTest = await autotaskService.testConnection();
    if (!connectionTest) {
      throw new Error('Connection to Autotask failed');
    }
    console.log('✅ Connection successful\n');
    
    // Create enhanced handler
    console.log('🚀 Creating enhanced tool handler...');
    const enhancedHandler = new EnhancedAutotaskToolHandler(autotaskService, logger);
    
    // Test search_tickets with enhancement
    console.log('🎫 Testing enhanced ticket search (first 5 tickets)...');
    const ticketResult = await enhancedHandler.callTool('search_tickets', {
      pageSize: 5  // Limit to 5 for testing
    });
    
    console.log('\n📋 Enhanced Ticket Search Results:');
    console.log('=====================================');
    
    if (ticketResult.content && ticketResult.content[0] && ticketResult.content[0].text) {
      const parsedResult = JSON.parse(ticketResult.content[0].text);
      
      if (parsedResult.items && Array.isArray(parsedResult.items)) {
        console.log(`Found ${parsedResult.items.length} tickets:\n`);
        
        parsedResult.items.forEach((ticket, index) => {
          console.log(`Ticket #${index + 1}:`);
          console.log(`  ID: ${ticket.id}`);
          console.log(`  Title: ${ticket.title || 'N/A'}`);
          console.log(`  Company ID: ${ticket.companyID}`);
          console.log(`  Assigned Resource ID: ${ticket.assignedResourceID || 'Unassigned'}`);
          
          // Check for enhanced data
          if (ticket._enhanced) {
            console.log(`  🌟 ENHANCED DATA:`);
            if (ticket._enhanced.companyName) {
              console.log(`    Company Name: ${ticket._enhanced.companyName}`);
            }
            if (ticket._enhanced.assignedResourceName) {
              console.log(`    Assigned Resource Name: ${ticket._enhanced.assignedResourceName}`);
            }
          } else {
            console.log(`  ❌ NO ENHANCED DATA FOUND`);
          }
          console.log('');
        });
        
        // Summary
        const enhancedTickets = parsedResult.items.filter(t => t._enhanced);
        console.log(`📊 Enhancement Summary:`);
        console.log(`  Total tickets: ${parsedResult.items.length}`);
        console.log(`  Enhanced tickets: ${enhancedTickets.length}`);
        console.log(`  Enhancement rate: ${((enhancedTickets.length / parsedResult.items.length) * 100).toFixed(1)}%`);
        
        // Test a specific case: look for tickets with company ID mappings
        const ticketsWithCompanyNames = parsedResult.items.filter(t => 
          t._enhanced && t._enhanced.companyName
        );
        console.log(`  Tickets with company names: ${ticketsWithCompanyNames.length}`);
        
        if (ticketsWithCompanyNames.length > 0) {
          console.log(`\n✅ SUCCESS: Enhanced tool handler is working!`);
          console.log(`   Example: Company ID ${ticketsWithCompanyNames[0].companyID} → "${ticketsWithCompanyNames[0]._enhanced.companyName}"`);
        } else {
          console.log(`\n⚠️  WARNING: No company name mappings found. This could mean:`);
          console.log(`   - All tickets are from companies not in cache`);
          console.log(`   - Mapping service is not working properly`);
        }
        
      } else {
        console.log('❌ No tickets found in response');
      }
    } else {
      console.log('❌ No content found in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testEnhancedToolHandler().catch(console.error); 