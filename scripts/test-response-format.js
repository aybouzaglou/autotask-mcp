// Test Response Format Debug
// This script shows exactly what data flows from base handler to enhanced handler

async function testResponseFormat() {
  console.log('🔍 Testing Response Format Flow...\\n');
  
  try {
    // Import modules from dist directory
    const { AutotaskService } = await import('../dist/services/autotask.service.js');
    const { AutotaskToolHandler } = await import('../dist/handlers/tool.handler.js');
    const { EnhancedAutotaskToolHandler } = await import('../dist/handlers/enhanced.tool.handler.js');
    const { Logger } = await import('../dist/utils/logger.js');
    const { loadEnvironmentConfig, mergeWithMcpConfig } = await import('../dist/utils/config.js');

    console.log('📊 Loading configuration...');
    const envConfig = loadEnvironmentConfig();
    const mcpConfig = mergeWithMcpConfig(envConfig);
    
    const logger = new Logger('info');
    console.log('🔧 Initializing services...');
    
    const autotaskService = new AutotaskService(mcpConfig, logger);
    
    // Test connection
    console.log('🔌 Testing connection...');
    const connection = await autotaskService.testConnection();
    console.log('Connection result:', connection);
    if (!connection) {
      throw new Error('Connection test failed');
    }
    console.log('✅ Connection successful\n');
    
    // Create both handlers
    const baseHandler = new AutotaskToolHandler(autotaskService, logger);
    const enhancedHandler = new EnhancedAutotaskToolHandler(autotaskService, logger);
    
    console.log('🎫 Testing BASE tool handler response format...');
    const baseResult = await baseHandler.callTool('search_tickets', { pageSize: 2 });
    
    console.log('📊 BASE HANDLER RESULT:');
    console.log('==========================================');
    console.log('Result type:', typeof baseResult);
    console.log('Has content:', !!baseResult.content);
    console.log('Content length:', baseResult.content?.length);
    if (baseResult.content && baseResult.content[0]) {
      console.log('Content[0] type:', typeof baseResult.content[0]);
      console.log('Content[0] text type:', typeof baseResult.content[0].text);
      console.log('Content[0] text length:', baseResult.content[0].text?.length);
      
      // Parse the JSON content to see structure
      try {
        const parsed = JSON.parse(baseResult.content[0].text);
        console.log('Parsed content keys:', Object.keys(parsed));
        console.log('Has message:', !!parsed.message);
        console.log('Has data:', !!parsed.data);
        console.log('Has timestamp:', !!parsed.timestamp);
        if (parsed.data) {
          console.log('Data type:', typeof parsed.data);
          console.log('Data is array:', Array.isArray(parsed.data));
          if (Array.isArray(parsed.data)) {
            console.log('Data array length:', parsed.data.length);
            if (parsed.data.length > 0) {
              console.log('First item keys:', Object.keys(parsed.data[0]));
              console.log('First item has companyID:', !!parsed.data[0].companyID);
              console.log('First item companyID value:', parsed.data[0].companyID);
            }
          }
        }
      } catch (error) {
        console.log('❌ Failed to parse JSON content:', error.message);
      }
    }
    
    console.log('\\n🌟 Testing ENHANCED tool handler response format...');
    const enhancedResult = await enhancedHandler.callTool('search_tickets', { pageSize: 2 });
    
    console.log('📊 ENHANCED HANDLER RESULT:');
    console.log('==========================================');
    console.log('Result type:', typeof enhancedResult);
    console.log('Has content:', !!enhancedResult.content);
    console.log('Content length:', enhancedResult.content?.length);
    if (enhancedResult.content && enhancedResult.content[0]) {
      console.log('Content[0] type:', typeof enhancedResult.content[0]);
      console.log('Content[0] text type:', typeof enhancedResult.content[0].text);
      console.log('Content[0] text length:', enhancedResult.content[0].text?.length);
      
      // Parse the JSON content to see structure
      try {
        const parsed = JSON.parse(enhancedResult.content[0].text);
        console.log('Enhanced parsed content keys:', Object.keys(parsed));
        console.log('Has _enhanced_note:', !!parsed._enhanced_note);
        console.log('Enhanced note:', parsed._enhanced_note);
        if (parsed.data) {
          console.log('Enhanced data type:', typeof parsed.data);
          console.log('Enhanced data is array:', Array.isArray(parsed.data));
          if (Array.isArray(parsed.data)) {
            console.log('Enhanced data array length:', parsed.data.length);
            if (parsed.data.length > 0) {
              console.log('Enhanced first item keys:', Object.keys(parsed.data[0]));
              console.log('Enhanced first item has _enhanced:', !!parsed.data[0]._enhanced);
              if (parsed.data[0]._enhanced) {
                console.log('Enhanced fields:', Object.keys(parsed.data[0]._enhanced));
                console.log('Company name mapping:', parsed.data[0]._enhanced.companyName);
              }
            }
          }
        }
      } catch (error) {
        console.log('❌ Failed to parse enhanced JSON content:', error.message);
      }
    }
    
    console.log('\\n✅ Response format test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testResponseFormat().catch(console.error); 