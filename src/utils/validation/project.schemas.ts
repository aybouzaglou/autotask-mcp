/**
 * Project Tool Validation Schemas
 *
 * Zod validation schemas for all Project-related tools.
 * Implements FR-007 (Input Validation with Clear Feedback).
 *
 * @see specs/004-mcp-best-practices-review/contracts/validation-schemas.contract.ts
 */

import { z } from 'zod';
import {
  PageSizeLimitedSchema,
  SearchTermSchema,
  PositiveIdSchema,
  DateStringSchema,
  createStringSchema,
} from './common.schemas.js';

/**
 * Search Projects Tool Parameters
 * Tool: autotask_search_projects
 *
 * Note: Projects are API-limited to max 100 results
 */
export const SearchProjectsInputSchema = z
  .object({
    searchTerm: SearchTermSchema,
    companyID: PositiveIdSchema.optional(),
    status: PositiveIdSchema.optional(),
    projectManagerResourceID: PositiveIdSchema.optional(),
    pageSize: PageSizeLimitedSchema,
  })
  .strict();

export type SearchProjectsInput = z.infer<typeof SearchProjectsInputSchema>;

/**
 * Create Project Tool Parameters
 * Tool: autotask_create_project
 */
export const CreateProjectInputSchema = z
  .object({
    companyID: PositiveIdSchema,
    projectName: createStringSchema(100, 'Project name', true) as z.ZodString,
    description: createStringSchema(8000, 'Project description', false),
    status: PositiveIdSchema,
    startDate: DateStringSchema.optional(),
    endDate: DateStringSchema.optional(),
    projectManagerResourceID: PositiveIdSchema.optional(),
    estimatedHours: z.number().nonnegative('Estimated hours must be non-negative').optional(),
  })
  .strict()
  .refine(
    (data) => {
      // If both dates are provided, endDate must be >= startDate
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end >= start;
      }
      return true;
    },
    {
      message: 'Project end date must be on or after start date',
      path: ['endDate'],
    },
  );

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

/**
 * Export all Project schemas as a const object
 */
export const ProjectSchemas = {
  SearchProjects: SearchProjectsInputSchema,
  CreateProject: CreateProjectInputSchema,
} as const;
