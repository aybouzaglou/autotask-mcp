// Structured Error Mapper
// Maps Autotask API errors to actionable responses with guidance

export interface MappedError {
  code: string;
  message: string;
  guidance: string;
  originalError?: any;
  correlationId?: string;
}

export class ErrorMapper {
  private static correlationCounter = 0;

  /**
   * Generate a unique correlation ID for error tracking
   */
  static generateCorrelationId(): string {
    this.correlationCounter++;
    const timestamp = Date.now();
    return `ERR-${timestamp}-${this.correlationCounter}`;
  }

  /**
   * Map an Autotask API error to a structured error response
   */
  static mapAutotaskError(error: any, context?: string): MappedError {
    const correlationId = this.generateCorrelationId();

    // Extract error details from various error formats
    const statusCode = error.response?.status || error.statusCode || 0;
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    const errorCode = error.response?.data?.code || error.code || 'UNKNOWN';

    // Map based on HTTP status code
    if (statusCode === 400) {
      return this.mapBadRequestError(errorMessage, errorCode, correlationId, context);
    } else if (statusCode === 401 || statusCode === 403) {
      return this.mapAuthorizationError(statusCode, errorMessage, correlationId, context);
    } else if (statusCode === 404) {
      return this.mapNotFoundError(errorMessage, correlationId, context);
    } else if (statusCode === 405) {
      return this.mapMethodNotAllowedError(errorMessage, correlationId, context);
    } else if (statusCode === 409) {
      return this.mapConflictError(errorMessage, correlationId, context);
    } else if (statusCode >= 500) {
      return this.mapServerError(statusCode, errorMessage, correlationId, context);
    }

    // Default mapping for unrecognized errors
    return {
      code: 'AUTOTASK_ERROR',
      message: `Autotask API error: ${errorMessage}`,
      guidance: 'Please check the error details and try again. If the problem persists, contact support.',
      originalError: error,
      correlationId,
    };
  }

  /**
   * Map 400 Bad Request errors
   */
  private static mapBadRequestError(
    message: string,
    _code: string,
    correlationId: string,
    _context?: string,
  ): MappedError {
    // Check for specific validation errors
    if (message.includes('inactive') || message.includes('not active')) {
      return {
        code: 'INACTIVE_RESOURCE',
        message: 'Cannot assign inactive resource to ticket',
        guidance:
          'Ensure the resource is active in Autotask before assigning. Use search_resources to find active resources.',
        correlationId,
      };
    }

    if (message.includes('invalid status') || message.includes('status')) {
      return {
        code: 'INVALID_STATUS',
        message: 'Invalid ticket status',
        guidance:
          'The provided status code is not valid for this ticket. Check allowed status transitions for your Autotask configuration.',
        correlationId,
      };
    }

    if (message.includes('invalid priority') || message.includes('priority')) {
      return {
        code: 'INVALID_PRIORITY',
        message: 'Invalid ticket priority',
        guidance:
          'The provided priority code is not valid. Use one of the allowed priority values (1=Low, 2=Medium, 3=High, 4=Critical, 5=Urgent).',
        correlationId,
      };
    }

    if (message.includes('required field') || message.includes('missing')) {
      return {
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Required field missing',
        guidance: `Missing a required field in the request. ${message}`,
        correlationId,
      };
    }

    // Generic bad request
    return {
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${message}`,
      guidance: 'Check that all required fields are provided and values are valid.',
      correlationId,
    };
  }

  /**
   * Map 401/403 authorization errors
   */
  private static mapAuthorizationError(
    statusCode: number,
    _message: string,
    correlationId: string,
    context?: string,
  ): MappedError {
    if (statusCode === 401) {
      return {
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed',
        guidance: 'Verify Autotask credentials (username, secret, integration code) are correct and not expired.',
        correlationId,
      };
    }

    // 403 Forbidden
    return {
      code: 'PERMISSION_DENIED',
      message: 'Permission denied',
      guidance: `Your Autotask API user does not have permission to perform this operation. ${context ? `Context: ${context}` : 'Contact your Autotask administrator to grant the required permissions.'}`,
      correlationId,
    };
  }

  /**
   * Map 404 Not Found errors
   */
  private static mapNotFoundError(message: string, correlationId: string, _context?: string): MappedError {
    return {
      code: 'RESOURCE_NOT_FOUND',
      message: `Resource not found: ${message}`,
      guidance: `The requested resource does not exist in Autotask. ${_context ? `Context: ${_context}` : 'Verify the ID and try again.'}`,
      correlationId,
    };
  }

  /**
   * Map 405 Method Not Allowed errors
   */
  private static mapMethodNotAllowedError(_message: string, correlationId: string, _context?: string): MappedError {
    return {
      code: 'METHOD_NOT_ALLOWED',
      message: 'HTTP method not allowed',
      guidance:
        'This operation is not supported by the Autotask API endpoint. This may indicate a configuration issue or API limitation.',
      correlationId,
    };
  }

  /**
   * Map 409 Conflict errors
   */
  private static mapConflictError(_message: string, correlationId: string, _context?: string): MappedError {
    return {
      code: 'CONFLICT',
      message: 'Data conflict detected',
      guidance: 'The ticket data may have been modified by another user. Refresh the ticket data and try again.',
      correlationId,
    };
  }

  /**
   * Map 5xx server errors
   */
  private static mapServerError(
    statusCode: number,
    _message: string,
    correlationId: string,
    _context?: string,
  ): MappedError {
    return {
      code: 'AUTOTASK_SERVER_ERROR',
      message: `Autotask server error (${statusCode})`,
      guidance:
        'The Autotask API is experiencing issues. Please retry in a few moments. If the problem persists, check Autotask service status.',
      correlationId,
    };
  }

  /**
   * Map validation errors from the validator
   */
  static mapValidationErrors(errors: string[], _context?: string): MappedError {
    const correlationId = this.generateCorrelationId();

    return {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      guidance: errors.join(' | '),
      correlationId,
    };
  }

  /**
   * Create a generic error mapping
   */
  static mapGenericError(message: string, code: string = 'ERROR'): MappedError {
    const correlationId = this.generateCorrelationId();

    return {
      code,
      message,
      guidance: 'An unexpected error occurred. Please try again or contact support.',
      correlationId,
    };
  }
}
