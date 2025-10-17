// Ticket Update Validator
// Validates and builds ticket update and note creation requests

import type {
  TicketNoteCreateRequest,
  TicketNotePublishLevel,
  TicketUpdateRequest,
} from '../types/autotask.js';
import { TicketMetadataCache } from './ticket-metadata.cache.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidatedTicketUpdate {
  payload: TicketUpdateRequest;
  validation: ValidationResult;
}

export interface ValidatedTicketNote {
  payload: TicketNoteCreateRequest;
  validation: ValidationResult;
}

export class TicketUpdateValidator {
  private metadataCache: TicketMetadataCache;

  // Constants from Autotask API
  private readonly MAX_NOTE_LENGTH = 32000;
  private readonly MAX_TITLE_LENGTH = 255;
  private readonly ALLOWED_PUBLISH_LEVELS: TicketNotePublishLevel[] = [1, 3];

  constructor(metadataCache: TicketMetadataCache) {
    this.metadataCache = metadataCache;
  }

  /**
   * Validate and build ticket update payload
   */
  validateTicketUpdate(request: Partial<TicketUpdateRequest>): ValidatedTicketUpdate {
    const errors: string[] = [];

    // Validate ticket ID
    if (!request.id || typeof request.id !== 'number') {
      errors.push('Ticket ID is required and must be a number');
    }

    // Validate status if provided
    if (request.status !== undefined) {
      if (!this.metadataCache.isValidStatus(request.status)) {
        const validStatuses = this.metadataCache.getAllStatuses()
          .map(s => `${s.id} (${s.name})`)
          .join(', ');
        errors.push(
          `Invalid status ID: ${request.status}. ` +
          `Valid statuses: ${validStatuses}`
        );
      }
    }

    // Validate priority if provided
    if (request.priority !== undefined) {
      if (!this.metadataCache.isValidPriority(request.priority)) {
        const validPriorities = this.metadataCache.getAllPriorities()
          .map(p => `${p.id} (${p.name})`)
          .join(', ');
        errors.push(
          `Invalid priority ID: ${request.priority}. ` +
          `Valid priorities: ${validPriorities}`
        );
      }
    }

    // Validate assigned resource if provided (null is allowed for unassignment)
    if (request.assignedResourceID !== undefined && request.assignedResourceID !== null) {
      if (!this.metadataCache.isValidResource(request.assignedResourceID)) {
        const resource = this.metadataCache.getResource(request.assignedResourceID);
        if (resource) {
          errors.push(
            `Resource ID ${request.assignedResourceID} is inactive. ` +
            `Only active resources can be assigned to tickets.`
          );
        } else {
          errors.push(
            `Resource ID ${request.assignedResourceID} not found. ` +
            `Ensure the resource exists and is active.`
          );
        }
      }
    }

    // Build the payload
    const payload: TicketUpdateRequest = {
      id: request.id!
    };

    // Add optional fields if provided and valid
    if (request.assignedResourceID !== undefined) {
      payload.assignedResourceID = request.assignedResourceID;
    }
    if (request.status !== undefined && errors.length === 0) {
      payload.status = request.status;
    }
    if (request.priority !== undefined && errors.length === 0) {
      payload.priority = request.priority;
    }
    if (request.queueID !== undefined) {
      payload.queueID = request.queueID;
    }
    if (request.title !== undefined) {
      payload.title = request.title;
    }
    if (request.description !== undefined) {
      payload.description = request.description;
    }
    if (request.resolution !== undefined) {
      payload.resolution = request.resolution;
    }
    if (request.dueDateTime) {
      payload.dueDateTime = request.dueDateTime;
    }
    if (request.lastActivityDate) {
      payload.lastActivityDate = request.lastActivityDate;
    }

    // Check if at least one field beyond ticket ID is provided
    const hasUpdateFields = Object.keys(payload).some(key => key !== 'id');
    if (!hasUpdateFields) {
      errors.push(
        'At least one field must be provided for update. ' +
        'Supported fields: assignedResourceID, status, priority, queueID, title, description, resolution, dueDateTime, lastActivityDate'
      );
    }

    return {
      payload,
      validation: {
        isValid: errors.length === 0,
        errors
      }
    };
  }

  /**
   * Validate and build ticket note creation payload
   */
  validateTicketNote(request: Partial<TicketNoteCreateRequest>): ValidatedTicketNote {
    const errors: string[] = [];

    // Validate ticket ID
    if (!request.ticketID || typeof request.ticketID !== 'number') {
      errors.push('Ticket ID is required and must be a number');
    }

    // Validate description (required)
    if (!request.description || typeof request.description !== 'string') {
      errors.push('Note description is required and must be a string');
    } else if (request.description.trim().length === 0) {
      errors.push('Note description cannot be empty');
    } else if (request.description.length > this.MAX_NOTE_LENGTH) {
      errors.push(
        `Note description exceeds maximum length of ${this.MAX_NOTE_LENGTH} characters. ` +
        `Current length: ${request.description.length}`
      );
    }

    // Validate publish level (required)
    if (request.publish === undefined || typeof request.publish !== 'number') {
      errors.push('Publish level is required and must be a number (1=Internal, 3=External)');
    } else if (!this.ALLOWED_PUBLISH_LEVELS.includes(request.publish)) {
      errors.push(
        `Invalid publish level: ${request.publish}. ` +
        `Allowed values: 1 (Internal), 3 (External)`
      );
    }

    // Validate title if provided (optional)
    if (request.title !== undefined) {
      if (typeof request.title !== 'string') {
        errors.push('Note title must be a string');
      } else if (request.title.length > this.MAX_TITLE_LENGTH) {
        errors.push(
          `Note title exceeds maximum length of ${this.MAX_TITLE_LENGTH} characters. ` +
          `Current length: ${request.title.length}`
        );
      }
    }

    // Build the payload (sanitize strings)
    const payload: TicketNoteCreateRequest = {
      ticketID: request.ticketID!,
      description: request.description ? this.sanitizeNoteContent(request.description) : '',
      publish: request.publish!
    };

    if (request.title) {
      payload.title = this.sanitizeNoteContent(request.title);
    }

    return {
      payload,
      validation: {
        isValid: errors.length === 0,
        errors
      }
    };
  }

  /**
   * Sanitize note content (trim whitespace, normalize line endings)
   */
  private sanitizeNoteContent(content: string): string {
    return content
      .trim()
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n');
  }

  /**
   * Build a PATCH payload for Autotask REST API (field names in PascalCase)
   */
  buildAutotaskPatchPayload(validated: ValidatedTicketUpdate): Record<string, any> {
    const payload: Record<string, any> = {};

    if (validated.payload.assignedResourceID !== undefined) {
      payload.AssignedResourceID = validated.payload.assignedResourceID;
    }
    if (validated.payload.status !== undefined) {
      payload.Status = validated.payload.status;
    }
    if (validated.payload.priority !== undefined) {
      payload.Priority = validated.payload.priority;
    }
    if (validated.payload.queueID !== undefined) {
      payload.QueueID = validated.payload.queueID;
    }
    if (validated.payload.lastActivityDate) {
      payload.LastActivityDate = validated.payload.lastActivityDate;
    }

    return payload;
  }

  /**
   * Build a note creation payload for Autotask REST API (field names in PascalCase)
   */
  buildAutotaskNotePayload(validated: ValidatedTicketNote): Record<string, any> {
    const payload: Record<string, any> = {
      TicketID: validated.payload.ticketID,
      Description: validated.payload.description,
      Publish: validated.payload.publish
    };

    if (validated.payload.title) {
      payload.Title = validated.payload.title;
    }

    return payload;
  }
}
