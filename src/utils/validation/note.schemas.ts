/**
 * Note Tool Validation Schemas
 *
 * Zod validation schemas for all Note-related tools (Ticket, Project, Company notes).
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import { PageSizeLimitedSchema, PositiveIdSchema, createStringSchema } from './common.schemas.js';

/**
 * Get Ticket Note Tool Parameters
 * Tool: autotask_get_ticket_note
 */
export const GetTicketNoteInputSchema = z
  .object({
    ticketId: PositiveIdSchema,
    noteId: PositiveIdSchema,
  })
  .strict();

export type GetTicketNoteInput = z.infer<typeof GetTicketNoteInputSchema>;

/**
 * Search Ticket Notes Tool Parameters
 * Tool: autotask_search_ticket_notes
 */
export const SearchTicketNotesInputSchema = z
  .object({
    ticketId: PositiveIdSchema,
    pageSize: PageSizeLimitedSchema,
  })
  .strict();

export type SearchTicketNotesInput = z.infer<typeof SearchTicketNotesInputSchema>;

/**
 * Create Ticket Note Tool Parameters
 * Tool: autotask_create_ticket_note
 */
export const CreateTicketNoteInputSchema = z
  .object({
    ticketId: PositiveIdSchema,
    title: createStringSchema(250, 'Note title', false),
    description: createStringSchema(32000, 'Note content', true) as z.ZodString,
    noteType: z
      .number()
      .int()
      .refine((val) => val >= 1 && val <= 6, {
        message:
          'Note type must be 1 (General), 2 (Appointment), 3 (Task), 4 (Ticket), 5 (Project), or 6 (Opportunity)',
      })
      .optional(),
    publish: z
      .number()
      .int()
      .refine((val) => val >= 1 && val <= 3, {
        message: 'Publish level must be 1 (Internal Only), 2 (All Autotask Users), or 3 (Everyone)',
      })
      .optional(),
  })
  .strict();

export type CreateTicketNoteInput = z.infer<typeof CreateTicketNoteInputSchema>;

/**
 * Get Project Note Tool Parameters
 * Tool: autotask_get_project_note
 */
export const GetProjectNoteInputSchema = z
  .object({
    projectId: PositiveIdSchema,
    noteId: PositiveIdSchema,
  })
  .strict();

export type GetProjectNoteInput = z.infer<typeof GetProjectNoteInputSchema>;

/**
 * Search Project Notes Tool Parameters
 * Tool: autotask_search_project_notes
 */
export const SearchProjectNotesInputSchema = z
  .object({
    projectId: PositiveIdSchema,
    pageSize: PageSizeLimitedSchema,
  })
  .strict();

export type SearchProjectNotesInput = z.infer<typeof SearchProjectNotesInputSchema>;

/**
 * Create Project Note Tool Parameters
 * Tool: autotask_create_project_note
 */
export const CreateProjectNoteInputSchema = z
  .object({
    projectId: PositiveIdSchema,
    title: createStringSchema(250, 'Note title', false),
    description: createStringSchema(32000, 'Note content', true) as z.ZodString,
    noteType: z
      .number()
      .int()
      .refine((val) => val >= 1 && val <= 6, {
        message:
          'Note type must be 1 (General), 2 (Appointment), 3 (Task), 4 (Ticket), 5 (Project), or 6 (Opportunity)',
      })
      .optional(),
  })
  .strict();

export type CreateProjectNoteInput = z.infer<typeof CreateProjectNoteInputSchema>;

/**
 * Get Company Note Tool Parameters
 * Tool: autotask_get_company_note
 */
export const GetCompanyNoteInputSchema = z
  .object({
    companyId: PositiveIdSchema,
    noteId: PositiveIdSchema,
  })
  .strict();

export type GetCompanyNoteInput = z.infer<typeof GetCompanyNoteInputSchema>;

/**
 * Search Company Notes Tool Parameters
 * Tool: autotask_search_company_notes
 */
export const SearchCompanyNotesInputSchema = z
  .object({
    companyId: PositiveIdSchema,
    pageSize: PageSizeLimitedSchema,
  })
  .strict();

export type SearchCompanyNotesInput = z.infer<typeof SearchCompanyNotesInputSchema>;

/**
 * Create Company Note Tool Parameters
 * Tool: autotask_create_company_note
 */
export const CreateCompanyNoteInputSchema = z
  .object({
    companyId: PositiveIdSchema,
    title: createStringSchema(250, 'Note title', false),
    description: createStringSchema(32000, 'Note content', true) as z.ZodString,
    actionType: PositiveIdSchema.optional(),
  })
  .strict();

export type CreateCompanyNoteInput = z.infer<typeof CreateCompanyNoteInputSchema>;

/**
 * Export all Note schemas as a const object
 */
export const NoteSchemas = {
  GetTicketNote: GetTicketNoteInputSchema,
  SearchTicketNotes: SearchTicketNotesInputSchema,
  CreateTicketNote: CreateTicketNoteInputSchema,
  GetProjectNote: GetProjectNoteInputSchema,
  SearchProjectNotes: SearchProjectNotesInputSchema,
  CreateProjectNote: CreateProjectNoteInputSchema,
  GetCompanyNote: GetCompanyNoteInputSchema,
  SearchCompanyNotes: SearchCompanyNotesInputSchema,
  CreateCompanyNote: CreateCompanyNoteInputSchema,
} as const;
