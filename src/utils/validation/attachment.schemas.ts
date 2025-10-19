/**
 * Attachment Tool Validation Schemas
 *
 * Zod validation schemas for all Attachment-related tools.
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import { PageSizeAttachmentsSchema, PositiveIdSchema } from './common.schemas.js';

/**
 * Search Ticket Attachments Tool Parameters
 * Tool: autotask_search_ticket_attachments
 */
export const SearchTicketAttachmentsInputSchema = z
  .object({
    ticketId: PositiveIdSchema,
    pageSize: PageSizeAttachmentsSchema,
  })
  .strict();

export type SearchTicketAttachmentsInput = z.infer<typeof SearchTicketAttachmentsInputSchema>;

/**
 * Get Ticket Attachment Tool Parameters
 * Tool: autotask_get_ticket_attachment
 */
export const GetTicketAttachmentInputSchema = z
  .object({
    ticketId: PositiveIdSchema,
    attachmentId: PositiveIdSchema,
    includeData: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to include base64 encoded file data (default: false)'),
  })
  .strict();

export type GetTicketAttachmentInput = z.infer<typeof GetTicketAttachmentInputSchema>;

/**
 * Export all Attachment schemas as a const object
 */
export const AttachmentSchemas = {
  SearchTicketAttachments: SearchTicketAttachmentsInputSchema,
  GetTicketAttachment: GetTicketAttachmentInputSchema,
} as const;
