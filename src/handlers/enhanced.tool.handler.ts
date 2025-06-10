/**
 * Enhanced Autotask Tool Handler with ID-to-Name Mapping
 * Extends the base tool handler to include automatic mapping of company and resource IDs to names
 */

import { McpToolResult } from './tool.handler.js';
import { AutotaskService } from '../services/autotask.service.js';
import { Logger } from '../utils/logger.js';
import { AutotaskToolHandler } from './tool.handler.js';
import { MappingService } from '../utils/mapping.service.js';

export interface EnhancedData {
  companyName?: string | null;
  resourceName?: string | null;
  assignedResourceName?: string | null;
}

export class EnhancedAutotaskToolHandler extends AutotaskToolHandler {
  private mappingService: MappingService | null = null;

  constructor(autotaskService: AutotaskService, logger: Logger) {
    super(autotaskService, logger);
  }

  /**
   * Initialize mapping service (singleton)
   */
  private async getMappingService(): Promise<MappingService> {
    if (!this.mappingService) {
      this.mappingService = await MappingService.getInstance(this.autotaskService, this.logger);
    }
    return this.mappingService;
  }

  /**
   * Override tool execution to add enhancement
   */
  public async callTool(name: string, args: any): Promise<McpToolResult> {
    try {
      // Execute the base tool first
      const baseResult = await super.callTool(name, args);
      
      // Enhance the result with name mappings
      const enhancedResult = await this.enhanceResult(baseResult);
      
      return enhancedResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Enhanced tool execution failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Enhance the result with mapped names
   */
  private async enhanceResult(baseResult: McpToolResult): Promise<McpToolResult> {
    try {
      const content = baseResult.content[0];
      if (!content || !content.text) {
        return baseResult;
      }
      
      const parsedContent = JSON.parse(content.text);
      
      // Handle the base tool handler format: { message, data, timestamp }
      let itemsToEnhance: any[] = [];
      if (parsedContent.data) {
        // Base tool handler format - data is in the 'data' field
        if (Array.isArray(parsedContent.data)) {
          itemsToEnhance = parsedContent.data;
        } else if (parsedContent.data.items && Array.isArray(parsedContent.data.items)) {
          itemsToEnhance = parsedContent.data.items;
        } else if (typeof parsedContent.data === 'object') {
          itemsToEnhance = [parsedContent.data];
        }
      } else {
        // Direct format handling (fallback)
        if (Array.isArray(parsedContent)) {
          itemsToEnhance = parsedContent;
        } else if (parsedContent.items && Array.isArray(parsedContent.items)) {
          itemsToEnhance = parsedContent.items;
        } else if (typeof parsedContent === 'object') {
          itemsToEnhance = [parsedContent];
        }
      }
      
      if (itemsToEnhance.length === 0) {
        this.logger.debug('No items found to enhance');
        return baseResult;
      }

      const mappingService = await this.getMappingService();
      
      // Enhanced items with name mapping (resilient to partial failures)
      const enhancedItems = await Promise.allSettled(
        itemsToEnhance.map(async (item) => {
          const enhanced: EnhancedData = {};
          
          // Try to map company ID to name
          if (item.companyID !== null && item.companyID !== undefined && typeof item.companyID === 'number') {
            try {
              enhanced.companyName = await mappingService.getCompanyName(item.companyID);
            } catch (error) {
              this.logger.debug(`Failed to map company ID ${item.companyID}:`, error);
            }
          }
          
          // Try to map assigned resource ID to name
          if (item.assignedResourceID !== null && item.assignedResourceID !== undefined && typeof item.assignedResourceID === 'number') {
            try {
              enhanced.assignedResourceName = await mappingService.getResourceName(item.assignedResourceID);
            } catch (error) {
              this.logger.debug(`Failed to map resource ID ${item.assignedResourceID}:`, error);
            }
          }
          
          // Return item with enhancement (even if some mappings failed)
          return {
            ...item,
            _enhanced: enhanced
          };
        })
      );
      
      // Extract successful enhancements (ignore failed ones)
      const successfulEnhancements = enhancedItems
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);
      
      // Log any mapping failures for debugging
      const failures = enhancedItems.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        this.logger.debug(`${failures.length} items had mapping failures but processing continued`);
      }
      
      // Reconstruct response maintaining the base tool handler format
      let enhancedData;
      if (Array.isArray(parsedContent.data)) {
        enhancedData = successfulEnhancements;
      } else if (parsedContent.data && parsedContent.data.items) {
        enhancedData = {
          ...parsedContent.data,
          items: successfulEnhancements
        };
      } else if (parsedContent.data) {
        enhancedData = successfulEnhancements[0] || parsedContent.data;
      } else {
        // Fallback for non-standard formats
        if (Array.isArray(parsedContent)) {
          enhancedData = successfulEnhancements;
        } else if (parsedContent.items) {
          enhancedData = {
            ...parsedContent,
            items: successfulEnhancements
          };
        } else {
          enhancedData = successfulEnhancements[0] || parsedContent;
        }
      }
      
      // Maintain the base tool handler response structure
      const enhancedResponse = parsedContent.data ? {
        message: parsedContent.message,
        data: enhancedData,
        timestamp: parsedContent.timestamp,
        _enhanced_note: `Added company/resource name mappings to ${successfulEnhancements.length} items`
      } : enhancedData;
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(enhancedResponse, null, 2)
        }],
        isError: false
      };
      
    } catch (error) {
      this.logger.error('Failed to enhance result:', error);
      // Return original result on enhancement failure
      return baseResult;
    }
  }
} 