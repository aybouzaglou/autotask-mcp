// Simple Enhanced Test
// Tests the enhanced tool handler without multiple cache loads

async function simpleEnhancedTest() {
  console.log('🎯 Testing Enhanced Tool Handler (Simple)...\n');
  
  try {
    // Import modules from dist directory
    const { AutotaskService } = await import('../dist/services/autotask.service.js');
    const { EnhancedAutotaskToolHandler } = await import('../dist/handlers/enhanced.tool.handler.js');
    const { Logger } = await import('../dist/utils/logger.js');
    const { loadEnvironmentConfig, mergeWithMcpConfig } = await import('../dist/utils/config.js');

    console.log('📊 Loading configuration...');
    const envConfig = loadEnvironmentConfig();
    const mcpConfig = mergeWithMcpConfig(envConfig);
    
    // Use simpler logging to avoid circular reference issues
    const logger = new Logger('warn', 'simple');
    const autotaskService = new AutotaskService(mcpConfig, logger);
    const enhancedHandler = new EnhancedAutotaskToolHandler(autotaskService, logger);
    
    console.log('🔍 Searching for just 3 open tickets...');
    
    // Search for just a few tickets to test enhancement
    const result = await enhancedHandler.callTool('search_tickets', {
      pageSize: 3,  // Very small number to avoid API abuse
      status: 1     // Open tickets
    });
    
    if (result.isError) {
      console.error('❌ Search failed:', result.content[0]?.text);
      return;
    }
    
    const data = JSON.parse(result.content[0].text);
    console.log('\n📋 Enhanced Search Results:');
    console.log(`Total tickets found: ${data.data?.items?.length || 'unknown'}`);
    
    if (data.data?.items?.length > 0) {
      console.log('\n🔍 Checking for enhancement data:');
      
      data.data.items.forEach((ticket, index) => {
        console.log(`\n--- Ticket ${index + 1} ---`);
        console.log(`ID: ${ticket.id}`);
        console.log(`Title: ${ticket.title}`);
        console.log(`Company ID: ${ticket.companyID}`);
        
        if (ticket._enhanced) {
          console.log(`✅ ENHANCED - Company Name: ${ticket._enhanced.companyName || 'Not found'}`);
          if (ticket._enhanced.assignedResourceName) {
            console.log(`✅ ENHANCED - Assigned To: ${ticket._enhanced.assignedResourceName}`);
          }
        } else {
          console.log('❌ NO ENHANCEMENT DATA FOUND');
        }
      });
    } else {
      console.log('❌ No tickets found in response');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error);
  }
}

simpleEnhancedTest()
  .then(() => {
    console.log('\n✅ Simple enhanced test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }); 