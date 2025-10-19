/**
 * Ticket Tool Validation Schemas
 *
 * Zod validation schemas for all Ticket-related tools.
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import {
  PageSizeStandardSchema,
  SearchTermSchema,
  PositiveIdSchema,
  BooleanFilterSchema,
  ISODateTimeSchema,
  createStringSchema,
} from './common.schemas.js';

/**
 * Search Tickets Tool Parameters
 * Tool: autotask_search_tickets
 */
export const SearchTicketsInputSchema = z
  .object({
    searchTerm: SearchTermSchema,
    companyID: PositiveIdSchema.optional(),
    status: PositiveIdSchema.optional(),
    assignedResourceID: PositiveIdSchema.optional(),
    unassigned: BooleanFilterSchema,
    pageSize: PageSizeStandardSchema,
  })
  .strict();

export type SearchTicketsInput = z.infer<typeof SearchTicketsInputSchema>;

/**
 * Get Ticket Details Tool Parameters
 * Tool: autotask_get_ticket_details
 */
export const GetTicketDetailsInputSchema = z
  .object({
    ticketID: PositiveIdSchema,
    fullDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to return full ticket details (default: false for optimized data)'),
  })
  .strict();

export type GetTicketDetailsInput = z.infer<typeof GetTicketDetailsInputSchema>;

/**
 * Create Ticket Tool Parameters
 * Tool: autotask_create_ticket
 */
export const CreateTicketInputSchema = z
  .object({
    companyID: PositiveIdSchema,
    title: createStringSchema(255, 'Ticket title', true) as z.ZodString,
    description: createStringSchema(8000, 'Ticket description', true) as z.ZodString,
    status: PositiveIdSchema.optional(),
    priority: PositiveIdSchema.optional(),
    assignedResourceID: PositiveIdSchema.optional(),
    contactID: PositiveIdSchema.optional(),
  })
  .strict();

export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>;

/**
 * Update Ticket Tool Parameters
 * Tool: autotask_update_ticket
 *
 * Follows PATCH semantics: ticketId required, at least one field must be provided.
 */
export const UpdateTicketInputSchema = z
  .object({
    ticketId: PositiveIdSchema,
    status: PositiveIdSchema.optional(),
    priority: PositiveIdSchema.optional(),
    queueID: PositiveIdSchema.optional(),
    dueDateTime: ISODateTimeSchema.optional(),
    title: createStringSchema(255, 'Ticket title', false),
    description: createStringSchema(8000, 'Ticket description', false),
    resolution: createStringSchema(8000, 'Resolution', false),
  })
  .strict()
  .refine(
    (data) => {
      // At least one field besides 'ticketId' must be provided
      const fields = Object.keys(data).filter((key) => key !== 'ticketId');
      return fields.length > 0;
    },
    {
      message:
        'At least one field must be provided for update (status, priority, queueID, dueDateTime, title, description, resolution)',
    },
  );

export type UpdateTicketInput = z.infer<typeof UpdateTicketInputSchema>;

/**
 * Export all Ticket schemas as a const object
 */
export const TicketSchemas = {
  SearchTickets: SearchTicketsInputSchema,
  GetTicketDetails: GetTicketDetailsInputSchema,
  CreateTicket: CreateTicketInputSchema,
  UpdateTicket: UpdateTicketInputSchema,
} as const;
