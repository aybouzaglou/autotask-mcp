/**
 * Time Entry Tool Validation Schemas
 *
 * Zod validation schemas for all Time Entry-related tools.
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import { PositiveIdSchema, DateStringSchema, ISODateTimeSchema, createStringSchema } from './common.schemas.js';

/**
 * Create Time Entry Tool Parameters
 * Tool: autotask_create_time_entry
 */
export const CreateTimeEntryInputSchema = z
  .object({
    ticketID: PositiveIdSchema.optional(),
    taskID: PositiveIdSchema.optional(),
    resourceID: PositiveIdSchema,
    dateWorked: DateStringSchema,
    startDateTime: ISODateTimeSchema.optional(),
    endDateTime: ISODateTimeSchema.optional(),
    hoursWorked: z
      .number()
      .positive('Hours worked must be positive')
      .max(24, 'Hours worked cannot exceed 24 hours in a day'),
    summaryNotes: createStringSchema(8000, 'Summary notes', true) as z.ZodString,
    internalNotes: createStringSchema(8000, 'Internal notes', false),
  })
  .strict()
  .refine(
    (data) => {
      // Either ticketID or taskID must be provided
      return data.ticketID !== undefined || data.taskID !== undefined;
    },
    {
      message: 'Either ticketID or taskID must be provided',
    },
  )
  .refine(
    (data) => {
      // If both startDateTime and endDateTime are provided, end must be after start
      if (data.startDateTime && data.endDateTime) {
        const start = new Date(data.startDateTime);
        const end = new Date(data.endDateTime);
        return end > start;
      }
      return true;
    },
    {
      message: 'End date/time must be after start date/time',
      path: ['endDateTime'],
    },
  );

export type CreateTimeEntryInput = z.infer<typeof CreateTimeEntryInputSchema>;

/**
 * Export all Time Entry schemas as a const object
 */
export const TimeSchemas = {
  CreateTimeEntry: CreateTimeEntryInputSchema,
} as const;
