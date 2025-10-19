// Response Size Validator
// Validates MCP response sizes to prevent protocol violations

import { Logger } from './logger.js';

export interface ValidationResult {
  valid: boolean;
  size: number;
  sizeKB: number;
  sizeMB: number;
  truncated?: any;
  warning?: string;
  error?: string;
}

export interface ResponseValidatorOptions {
  maxSizeBytes?: number;
  warningThresholdPercent?: number;
  logger?: Logger;
}

/**
 * Validates MCP response sizes against protocol limits
 *
 * MCP protocol has a practical limit of ~1MB for JSON-RPC messages.
 * This validator helps prevent "result exceeds maximum length" errors.
 */
export class ResponseValidator {
  private maxSizeBytes: number;
  private warningThreshold: number;
  private warningThresholdPercent: number;
  private logger: Logger;

  constructor(options: ResponseValidatorOptions = {}) {
    // Default to 900KB safety margin (MCP limit is ~1MB)
    this.maxSizeBytes = options.maxSizeBytes ?? 900000;

    // Warning at 80% of max size by default
    this.warningThresholdPercent = options.warningThresholdPercent ?? 0.8;
    this.warningThreshold = Math.floor(this.maxSizeBytes * this.warningThresholdPercent);

    this.logger = options.logger ?? new Logger();
  }

  /**
   * Validate response size and return detailed results
   */
  validateResponseSize(data: any, context?: string): ValidationResult {
    try {
      const jsonString = JSON.stringify(data);
      const sizeBytes = Buffer.byteLength(jsonString, 'utf8');
      const sizeKB = sizeBytes / 1024;
      const sizeMB = sizeKB / 1024;

      const contextStr = context ? ` (${context})` : '';

      // Check if exceeds maximum
      if (sizeBytes > this.maxSizeBytes) {
        const error = `Response size ${sizeMB.toFixed(2)}MB exceeds maximum ${(this.maxSizeBytes / 1024 / 1024).toFixed(2)}MB${contextStr}`;
        this.logger.error(error, {
          size: sizeBytes,
          maxSize: this.maxSizeBytes,
          context,
        });

        return {
          valid: false,
          size: sizeBytes,
          sizeKB: parseFloat(sizeKB.toFixed(2)),
          sizeMB: parseFloat(sizeMB.toFixed(3)),
          error,
        };
      }

      // Check if approaching warning threshold
      if (sizeBytes > this.warningThreshold) {
        const percentUsed = ((sizeBytes / this.maxSizeBytes) * 100).toFixed(1);
        const warning = `Response size ${sizeMB.toFixed(2)}MB is ${percentUsed}% of maximum${contextStr}`;

        this.logger.warn(warning, {
          size: sizeBytes,
          warningThreshold: this.warningThreshold,
          maxSize: this.maxSizeBytes,
          percentUsed: `${percentUsed}%`,
          context,
        });

        return {
          valid: true,
          size: sizeBytes,
          sizeKB: parseFloat(sizeKB.toFixed(2)),
          sizeMB: parseFloat(sizeMB.toFixed(3)),
          warning,
        };
      }

      // Size is acceptable
      this.logger.debug(`Response size ${sizeKB.toFixed(2)}KB is within limits${contextStr}`, {
        size: sizeBytes,
        maxSize: this.maxSizeBytes,
        context,
      });

      return {
        valid: true,
        size: sizeBytes,
        sizeKB: parseFloat(sizeKB.toFixed(2)),
        sizeMB: parseFloat(sizeMB.toFixed(3)),
      };
    } catch (error: unknown) {
      const err = error as Error;
      const errorMsg = `Failed to validate response size: ${err.message}`;

      this.logger.error(errorMsg, {
        error: err.message,
        context,
      });

      return {
        valid: false,
        size: 0,
        sizeKB: 0,
        sizeMB: 0,
        error: errorMsg,
      };
    }
  }

  /**
   * Get size of data without full validation
   */
  getSize(data: any): { bytes: number; kb: number; mb: number } {
    try {
      const jsonString = JSON.stringify(data);
      const bytes = Buffer.byteLength(jsonString, 'utf8');

      return {
        bytes,
        kb: parseFloat((bytes / 1024).toFixed(2)),
        mb: parseFloat((bytes / 1024 / 1024).toFixed(3)),
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Failed to calculate data size', {
        error: err.message,
      });

      return { bytes: 0, kb: 0, mb: 0 };
    }
  }

  /**
   * Check if data would exceed size limit (fast check)
   */
  wouldExceedLimit(data: any): boolean {
    const size = this.getSize(data);
    return size.bytes > this.maxSizeBytes;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      maxSizeBytes: this.maxSizeBytes,
      maxSizeKB: parseFloat((this.maxSizeBytes / 1024).toFixed(2)),
      maxSizeMB: parseFloat((this.maxSizeBytes / 1024 / 1024).toFixed(2)),
      warningThreshold: this.warningThreshold,
      warningThresholdKB: parseFloat((this.warningThreshold / 1024).toFixed(2)),
      warningThresholdMB: parseFloat((this.warningThreshold / 1024 / 1024).toFixed(2)),
      warningThresholdPercent: this.warningThresholdPercent * 100,
    };
  }
}

/**
 * Standalone function for quick validation
 *
 * @param data - Data to validate
 * @param maxSizeBytes - Maximum size in bytes (default: 900KB)
 * @param context - Optional context for logging
 * @returns Validation result
 */
export function validateResponseSize(data: any, maxSizeBytes: number = 900000, context?: string): ValidationResult {
  const validator = new ResponseValidator({ maxSizeBytes });
  return validator.validateResponseSize(data, context);
}

/**
 * Calculate response size for logging/metrics
 *
 * @param data - Data to measure
 * @returns Size in bytes, KB, and MB
 */
export function getResponseSize(data: any): { bytes: number; kb: number; mb: number } {
  const validator = new ResponseValidator();
  return validator.getSize(data);
}
