/**
 * Task Tool Validation Schemas
 *
 * Zod validation schemas for all Task-related tools.
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import {
  PageSizeLimitedSchema,
  SearchTermSchema,
  PositiveIdSchema,
  ISODateTimeSchema,
  createStringSchema,
} from './common.schemas.js';

/**
 * Search Tasks Tool Parameters
 * Tool: autotask_search_tasks
 */
export const SearchTasksInputSchema = z
  .object({
    searchTerm: SearchTermSchema,
    projectID: PositiveIdSchema.optional(),
    status: PositiveIdSchema.optional(),
    assignedResourceID: PositiveIdSchema.optional(),
    pageSize: PageSizeLimitedSchema,
  })
  .strict();

export type SearchTasksInput = z.infer<typeof SearchTasksInputSchema>;

/**
 * Create Task Tool Parameters
 * Tool: autotask_create_task
 */
export const CreateTaskInputSchema = z
  .object({
    projectID: PositiveIdSchema,
    title: createStringSchema(255, 'Task title', true) as z.ZodString,
    description: createStringSchema(8000, 'Task description', false),
    status: PositiveIdSchema,
    assignedResourceID: PositiveIdSchema.optional(),
    estimatedHours: z.number().nonnegative('Estimated hours must be non-negative').optional(),
    startDateTime: ISODateTimeSchema.optional(),
    endDateTime: ISODateTimeSchema.optional(),
  })
  .strict()
  .refine(
    (data) => {
      // If both dates are provided, endDateTime must be >= startDateTime
      if (data.startDateTime && data.endDateTime) {
        const start = new Date(data.startDateTime);
        const end = new Date(data.endDateTime);
        return end >= start;
      }
      return true;
    },
    {
      message: 'End date/time must be on or after start date/time',
      path: ['endDateTime'],
    },
  );

export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

/**
 * Export all Task schemas as a const object
 */
export const TaskSchemas = {
  SearchTasks: SearchTasksInputSchema,
  CreateTask: CreateTaskInputSchema,
} as const;
