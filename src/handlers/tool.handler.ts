// Autotask Tool Handler
// Handles MCP tool calls for Autotask operations (search, create, update)

import { AutotaskService } from '../services/autotask.service.js';
import { Logger } from '../utils/logger.js';
import { TicketUpdateValidator } from '../services/ticket-update.validator.js';
import { ErrorMapper } from '../utils/error-mapper.js';
import { McpTool, McpToolResult } from '../types/mcp.js';
import {
  READ_ONLY_ANNOTATIONS,
  CREATE_ANNOTATIONS,
  UPDATE_ANNOTATIONS,
  TEST_ANNOTATIONS,
} from '../utils/validation/tool-annotations.js';
import { ZodError } from 'zod';
import { formatZodError } from '../utils/validation/error-formatter.js';
import { CompanySchemas } from '../utils/validation/company.schemas.js';
import { ContactSchemas } from '../utils/validation/contact.schemas.js';
import { TicketSchemas } from '../utils/validation/ticket.schemas.js';
import { ProjectSchemas } from '../utils/validation/project.schemas.js';
import { TimeSchemas } from '../utils/validation/time.schemas.js';
import { ResourceSchemas } from '../utils/validation/resource.schemas.js';
import { ContractSchemas } from '../utils/validation/contract.schemas.js';
import { QuoteSchemas } from '../utils/validation/quote.schemas.js';
import { TaskSchemas } from '../utils/validation/task.schemas.js';
import { NoteSchemas } from '../utils/validation/note.schemas.js';
import { AttachmentSchemas } from '../utils/validation/attachment.schemas.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Legacy PAGE_SIZE constants kept for tools without Zod schemas
// (Expense Reports, Configuration Items, Invoices)
const PAGE_SIZE_MEDIUM = {
  type: 'number',
  description:
    'Number of results to return. **IMPORTANT: If omitted, returns ONLY FIRST 25 results!** Set to -1 to get ALL matching results (may be slow). Max: 500.',
  minimum: -1,
  maximum: 500,
};

const PAGE_SIZE_LIMITED = {
  type: 'number',
  description:
    'Number of results to return. **IMPORTANT: If omitted, returns ONLY FIRST 25 results!** Set to -1 to get up to 100 results (API limited). Max: 100.',
  minimum: -1,
  maximum: 100,
};

export class AutotaskToolHandler {
  protected autotaskService: AutotaskService;
  protected logger: Logger;
  protected validator: TicketUpdateValidator | null = null;

  constructor(autotaskService: AutotaskService, logger: Logger) {
    this.autotaskService = autotaskService;
    this.logger = logger;
  }

  /**
   * Get or create the validator (lazy initialization)
   */
  private getValidator(): TicketUpdateValidator {
    if (!this.validator) {
      const metadataCache = this.autotaskService.getMetadataCache();
      this.validator = new TicketUpdateValidator(metadataCache);
    }
    return this.validator;
  }

  /**
   * Remove undefined values from validated arguments
   *
   * Zod schemas with optional fields return types like `string | undefined`,
   * but service methods expect exact optional types due to exactOptionalPropertyTypes.
   * This helper strips undefined values to maintain type compatibility.
   *
   * @param obj - The validated object from Zod
   * @returns Object with undefined values removed
   */
  private removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        (result as any)[key] = value;
      }
    }
    return result;
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<McpTool[]> {
    this.logger.debug('Listing available Autotask tools');

    const tools: McpTool[] = [
      // Connection testing
      {
        name: 'autotask_test_connection',
        description: 'Test the connection to Autotask API',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
        annotations: {
          title: 'Test Connection',
          ...TEST_ANNOTATIONS,
        },
      },

      // Company tools (T049: JSON Schema from Zod)
      {
        name: 'autotask_search_companies',
        description:
          "Search for companies in Autotask. Returns 50 companies by default. **BEST PRACTICE: Always use 'searchTerm' for targeted lookups** (e.g., searchTerm: 'mandevco' to find 'Mandevco Properties Inc.'). Use 'isActive: true' to filter active companies only. Only use pageSize: -1 if you genuinely need all matching records.",
        inputSchema: zodToJsonSchema(CompanySchemas.SearchCompanies, 'SearchCompaniesInput') as any,
        annotations: {
          title: 'Search Companies',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_create_company',
        description: 'Create a new company in Autotask',
        inputSchema: zodToJsonSchema(CompanySchemas.CreateCompany, 'CreateCompanyInput') as any,
        annotations: {
          title: 'Create Company',
          ...CREATE_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_update_company',
        description: 'Update an existing company in Autotask',
        inputSchema: zodToJsonSchema(CompanySchemas.UpdateCompany, 'UpdateCompanyInput') as any,
        annotations: {
          title: 'Update Company',
          ...UPDATE_ANNOTATIONS,
        },
      },

      // Contact tools (T050: JSON Schema from Zod)
      {
        name: 'autotask_search_contacts',
        description:
          'Search for contacts in Autotask. **IMPORTANT: Returns ONLY first 50 matching contacts by default** - if you need ALL contacts matching your query, you MUST set pageSize: -1. Use filters (searchTerm, companyID, isActive) to narrow results.',
        inputSchema: zodToJsonSchema(ContactSchemas.SearchContacts, 'SearchContactsInput') as any,
        annotations: {
          title: 'Search Contacts',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_create_contact',
        description: 'Create a new contact in Autotask',
        inputSchema: zodToJsonSchema(ContactSchemas.CreateContact, 'CreateContactInput') as any,
        annotations: {
          title: 'Create Contact',
          ...CREATE_ANNOTATIONS,
        },
      },

      // Ticket tools (T051: JSON Schema from Zod)
      {
        name: 'autotask_search_tickets',
        description:
          'Search for tickets in Autotask. **IMPORTANT: Returns ONLY first 50 matching tickets by default** - if you need ALL tickets matching your query, you MUST set pageSize: -1. Use filters (searchTerm, companyID, status, assignedResourceID) to narrow results. For full ticket data, use get_ticket_details.',
        inputSchema: zodToJsonSchema(TicketSchemas.SearchTickets, 'SearchTicketsInput') as any,
        annotations: {
          title: 'Search Tickets',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_get_ticket_details',
        description: 'Get detailed information for a specific ticket by ID. Use this for full ticket data when needed.',
        inputSchema: zodToJsonSchema(TicketSchemas.GetTicketDetails, 'GetTicketDetailsInput') as any,
        annotations: {
          title: 'Get Ticket Details',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_create_ticket',
        description: 'Create a new ticket in Autotask',
        inputSchema: zodToJsonSchema(TicketSchemas.CreateTicket, 'CreateTicketInput') as any,
        annotations: {
          title: 'Create Ticket',
          ...CREATE_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_update_ticket',
        description: 'Update an existing ticket in Autotask using PATCH semantics for core fields',
        inputSchema: zodToJsonSchema(TicketSchemas.UpdateTicket, 'UpdateTicketInput') as any,
        annotations: {
          title: 'Update Ticket',
          ...UPDATE_ANNOTATIONS,
        },
      },

      // Time entry tools (T053: JSON Schema from Zod)
      {
        name: 'autotask_create_time_entry',
        description: 'Create a time entry in Autotask',
        inputSchema: zodToJsonSchema(TimeSchemas.CreateTimeEntry, 'CreateTimeEntryInput') as any,
        annotations: {
          title: 'Create Time Entry',
          ...CREATE_ANNOTATIONS,
        },
      },

      // Project tools (T052: JSON Schema from Zod)
      {
        name: 'autotask_search_projects',
        description:
          'Search for projects in Autotask. Returns 25 optimized projects by default (API limited to max 100). Use filters (searchTerm, companyID, status) to narrow results.',
        inputSchema: zodToJsonSchema(ProjectSchemas.SearchProjects, 'SearchProjectsInput') as any,
        annotations: {
          title: 'Search Projects',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_create_project',
        description: 'Create a new project in Autotask',
        inputSchema: zodToJsonSchema(ProjectSchemas.CreateProject, 'CreateProjectInput') as any,
        annotations: {
          title: 'Create Project',
          ...CREATE_ANNOTATIONS,
        },
      },

      // Resource tools (T054: JSON Schema from Zod)
      {
        name: 'autotask_search_resources',
        description:
          'Search for resources (users) in Autotask. Returns 25 resources by default. Use filters (searchTerm, isActive, resourceType) to narrow results before requesting more data.',
        inputSchema: zodToJsonSchema(ResourceSchemas.SearchResources, 'SearchResourcesInput') as any,
        annotations: {
          title: 'Search Resources',
          ...READ_ONLY_ANNOTATIONS,
        },
      },

      // =====================================================
      // NEW TOOLS - Phase 1: High-Priority Entity Support
      // =====================================================

      // Ticket Notes tools (T058: JSON Schema from Zod)
      {
        name: 'autotask_get_ticket_note',
        description: 'Get a specific ticket note by ticket ID and note ID',
        inputSchema: zodToJsonSchema(NoteSchemas.GetTicketNote, 'GetTicketNoteInput') as any,
        annotations: {
          title: 'Get Ticket Note',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_search_ticket_notes',
        description: 'Search for notes on a specific ticket. Returns 25 notes by default (max: 100).',
        inputSchema: zodToJsonSchema(NoteSchemas.SearchTicketNotes, 'SearchTicketNotesInput') as any,
        annotations: {
          title: 'Search Ticket Notes',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_create_ticket_note',
        description: 'Create a new note for a ticket',
        inputSchema: zodToJsonSchema(NoteSchemas.CreateTicketNote, 'CreateTicketNoteInput') as any,
        annotations: {
          title: 'Create Ticket Note',
          ...CREATE_ANNOTATIONS,
        },
      },

      // Project Notes tools (T058: JSON Schema from Zod)
      {
        name: 'autotask_get_project_note',
        description: 'Get a specific project note by project ID and note ID',
        inputSchema: zodToJsonSchema(NoteSchemas.GetProjectNote, 'GetProjectNoteInput') as any,
        annotations: {
          title: 'Get Project Note',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_search_project_notes',
        description: 'Search for notes on a specific project. Returns 25 notes by default (max: 100).',
        inputSchema: zodToJsonSchema(NoteSchemas.SearchProjectNotes, 'SearchProjectNotesInput') as any,
        annotations: {
          title: 'Search Project Notes',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_create_project_note',
        description: 'Create a new note for a project',
        inputSchema: zodToJsonSchema(NoteSchemas.CreateProjectNote, 'CreateProjectNoteInput') as any,
        annotations: {
          title: 'Create Project Note',
          ...CREATE_ANNOTATIONS,
        },
      },

      // Company Notes tools (T058: JSON Schema from Zod)
      {
        name: 'autotask_get_company_note',
        description: 'Get a specific company note by company ID and note ID',
        inputSchema: zodToJsonSchema(NoteSchemas.GetCompanyNote, 'GetCompanyNoteInput') as any,
        annotations: {
          title: 'Get Company Note',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_search_company_notes',
        description: 'Search for notes on a specific company. Returns 25 notes by default (max: 100).',
        inputSchema: zodToJsonSchema(NoteSchemas.SearchCompanyNotes, 'SearchCompanyNotesInput') as any,
        annotations: {
          title: 'Search Company Notes',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_create_company_note',
        description: 'Create a new note for a company',
        inputSchema: zodToJsonSchema(NoteSchemas.CreateCompanyNote, 'CreateCompanyNoteInput') as any,
        annotations: {
          title: 'Create Company Note',
          ...CREATE_ANNOTATIONS,
        },
      },

      // Ticket Attachments tools (T059: JSON Schema from Zod)
      {
        name: 'autotask_search_ticket_attachments',
        description:
          'Search for attachments on a specific ticket. Returns 10 attachments by default (max: 50). Attachments can be large.',
        inputSchema: zodToJsonSchema(AttachmentSchemas.SearchTicketAttachments, 'SearchTicketAttachmentsInput') as any,
        annotations: {
          title: 'Search Ticket Attachments',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_get_ticket_attachment',
        description: 'Get a specific ticket attachment by ticket ID and attachment ID',
        inputSchema: zodToJsonSchema(AttachmentSchemas.GetTicketAttachment, 'GetTicketAttachmentInput') as any,
        annotations: {
          title: 'Get Ticket Attachment',
          ...READ_ONLY_ANNOTATIONS,
        },
      },

      // Expense Reports tools
      {
        name: 'autotask_get_expense_report',
        description: 'Get a specific expense report by ID',
        inputSchema: {
          type: 'object',
          properties: {
            reportId: {
              type: 'number',
              description: 'The expense report ID to retrieve',
            },
          },
          required: ['reportId'],
        },
        annotations: {
          title: 'Get Expense Report',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_search_expense_reports',
        description:
          'Search for expense reports. Returns 25 reports by default (max: 100). Use filters (submitterId, status) to narrow results.',
        inputSchema: {
          type: 'object',
          properties: {
            submitterId: {
              type: 'number',
              description: 'Filter by submitter resource ID',
            },
            status: {
              type: 'number',
              description: 'Filter by status (1=New, 2=Submitted, 3=Approved, 4=Paid, 5=Rejected, 6=InReview)',
            },
            pageSize: PAGE_SIZE_LIMITED,
          },
          required: [],
        },
        annotations: {
          title: 'Search Expense Reports',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_create_expense_report',
        description: 'Create a new expense report',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Expense report name',
            },
            description: {
              type: 'string',
              description: 'Expense report description',
            },
            submitterId: {
              type: 'number',
              description: 'The resource ID of the submitter',
            },
            weekEndingDate: {
              type: 'string',
              description: 'Week ending date (YYYY-MM-DD format)',
            },
          },
          required: ['submitterId'],
        },
        annotations: {
          title: 'Create Expense Report',
          ...CREATE_ANNOTATIONS,
        },
      },

      // Quotes tools (T056: JSON Schema from Zod)
      {
        name: 'autotask_get_quote',
        description: 'Get a specific quote by ID',
        inputSchema: zodToJsonSchema(QuoteSchemas.GetQuote, 'GetQuoteInput') as any,
        annotations: {
          title: 'Get Quote',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_search_quotes',
        description:
          'Search for quotes. Returns 25 quotes by default (max: 100). Use filters (companyId, contactId, opportunityId, searchTerm) to narrow results.',
        inputSchema: zodToJsonSchema(QuoteSchemas.SearchQuotes, 'SearchQuotesInput') as any,
        annotations: {
          title: 'Search Quotes',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_create_quote',
        description: 'Create a new quote',
        inputSchema: zodToJsonSchema(QuoteSchemas.CreateQuote, 'CreateQuoteInput') as any,
        annotations: {
          title: 'Create Quote',
          ...CREATE_ANNOTATIONS,
        },
      },

      // Configuration Item tools
      {
        name: 'autotask_search_configuration_items',
        description:
          'Search for configuration items (assets) in Autotask. Returns 25 items by default. Use filters (searchTerm, companyID, isActive, productID) to narrow results.',
        inputSchema: {
          type: 'object',
          properties: {
            searchTerm: {
              type: 'string',
              description: 'Search term for configuration item name',
            },
            companyID: {
              type: 'number',
              description: 'Filter by company ID',
            },
            isActive: {
              type: 'boolean',
              description: 'Filter by active status',
            },
            productID: {
              type: 'number',
              description: 'Filter by product ID',
            },
            pageSize: PAGE_SIZE_MEDIUM,
          },
          required: [],
        },
        annotations: {
          title: 'Search Configuration Items',
          ...READ_ONLY_ANNOTATIONS,
        },
      },

      // Contract tools (T055: JSON Schema from Zod)
      {
        name: 'autotask_search_contracts',
        description:
          'Search for contracts in Autotask. Returns 25 contracts by default. Use filters (searchTerm, companyID, status) to narrow results before requesting more data.',
        inputSchema: zodToJsonSchema(ContractSchemas.SearchContracts, 'SearchContractsInput') as any,
        annotations: {
          title: 'Search Contracts',
          ...READ_ONLY_ANNOTATIONS,
        },
      },

      // Invoice tools
      {
        name: 'autotask_search_invoices',
        description:
          'Search for invoices in Autotask. Returns 25 invoices by default. Use filters (companyID, invoiceNumber, isVoided) to narrow results before requesting more data.',
        inputSchema: {
          type: 'object',
          properties: {
            companyID: {
              type: 'number',
              description: 'Filter by company ID',
            },
            invoiceNumber: {
              type: 'string',
              description: 'Filter by invoice number',
            },
            isVoided: {
              type: 'boolean',
              description: 'Filter by voided status',
            },
            pageSize: PAGE_SIZE_MEDIUM,
          },
          required: [],
        },
        annotations: {
          title: 'Search Invoices',
          ...READ_ONLY_ANNOTATIONS,
        },
      },

      // Task tools (T057: JSON Schema from Zod)
      {
        name: 'autotask_search_tasks',
        description:
          'Search for tasks in Autotask. Returns 25 optimized tasks by default (API limited to max 100). Use filters (searchTerm, projectID, status, assignedResourceID) to narrow results.',
        inputSchema: zodToJsonSchema(TaskSchemas.SearchTasks, 'SearchTasksInput') as any,
        annotations: {
          title: 'Search Tasks',
          ...READ_ONLY_ANNOTATIONS,
        },
      },
      {
        name: 'autotask_create_task',
        description: 'Create a new task in Autotask',
        inputSchema: zodToJsonSchema(TaskSchemas.CreateTask, 'CreateTaskInput') as any,
        annotations: {
          title: 'Create Task',
          ...CREATE_ANNOTATIONS,
        },
      },
    ];

    this.logger.debug(`Listed ${tools.length} available tools`);
    return tools;
  }

  /**
   * Call a tool with the given arguments
   */
  async callTool(name: string, args: Record<string, any>): Promise<McpToolResult> {
    this.logger.debug(`Calling tool: ${name}`, args);

    try {
      let result: any;
      let message: string;

      switch (name) {
        case 'autotask_test_connection': {
          const connectionResult = await this.autotaskService.testConnection();
          result = { success: connectionResult };
          message = connectionResult
            ? 'Successfully connected to Autotask API'
            : 'Connection failed: Unable to connect to Autotask API';
          break;
        }

        case 'autotask_search_companies': {
          // Validate input parameters using Zod schema
          const validation = CompanySchemas.SearchCompanies.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_companies');
          }

          const validatedArgs = validation.data;
          const startTime = Date.now();
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 50;
          const searchTerm = validatedArgs.searchTerm?.toLowerCase().trim();

          // Log query parameters for observability
          this.logger.info('search_companies query', {
            searchTerm: validatedArgs.searchTerm,
            isActive: validatedArgs.isActive,
            requestedPageSize,
            hasFilters: !!(validatedArgs.searchTerm || validatedArgs.isActive !== undefined),
          });

          // Strategy 1: Targeted search with safe defaults
          // If searchTerm is provided and pageSize not specified, use safe default
          const searchOptions = {
            ...validatedArgs,
            pageSize: requestedPageSize !== undefined ? requestedPageSize : defaultPageSize,
          };

          result = await this.autotaskService.searchCompanies(searchOptions);

          const queryTime = Date.now() - startTime;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : requestedPageSize || defaultPageSize;

          // Log result metrics
          this.logger.info('search_companies results', {
            resultCount: result.length,
            queryTimeMs: queryTime,
            wasTruncated: result.length >= effectivePageSize && effectivePageSize !== Infinity,
          });

          // Performance warning for large result sets
          if (result.length > 100) {
            this.logger.warn(
              `Large result set returned: ${result.length} companies. Consider using more specific filters (searchTerm, isActive).`,
            );
          }

          // Strategy 2: Exact match prioritization
          // If searchTerm provided, check for exact match first
          if (searchTerm && result.length > 1) {
            const exactMatches = result.filter(
              (company: any) => company.companyName?.toLowerCase().trim() === searchTerm,
            );

            if (exactMatches.length === 1) {
              // Found exactly one exact match - prioritize it
              result = [exactMatches[0], ...result.filter((c: any) => c.id !== exactMatches[0].id)];
              message = `Found exact match: "${exactMatches[0].companyName}" (plus ${result.length - 1} similar results)`;
              break;
            } else if (exactMatches.length > 1) {
              // Multiple exact matches (rare) - return them first
              const otherMatches = result.filter((c: any) => !exactMatches.some((em: any) => em.id === c.id));
              result = [...exactMatches, ...otherMatches];
              message = `Found ${exactMatches.length} exact matches for "${validatedArgs.searchTerm}" (plus ${otherMatches.length} similar results)`;
              break;
            }
          }

          // Default messaging
          const isTruncated = result.length >= effectivePageSize && effectivePageSize !== Infinity;

          if (isTruncated) {
            message = `Returning ${result.length} companies (results may be truncated). To see all results, use pageSize: -1 or add filters (searchTerm, isActive).`;
          } else if (result.length === 0 && !searchTerm && requestedPageSize !== -1) {
            // No results and no filters - suggest using searchTerm
            message = `No companies found. Try adding searchTerm parameter or use pageSize: -1 to fetch all companies.`;
          } else {
            message = `Found ${result.length} companies`;
          }
          break;
        }

        case 'autotask_create_company': {
          // Validate input parameters using Zod schema
          const validation = CompanySchemas.CreateCompany.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_create_company');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.createCompany(validatedArgs as any);
          message = `Successfully created company with ID: ${result}`;
          break;
        }

        case 'autotask_update_company': {
          // Validate input parameters using Zod schema
          const validation = CompanySchemas.UpdateCompany.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_update_company');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const { id, ...updateFields } = validatedArgs;
          result = await this.autotaskService.updateCompany(id as number, updateFields as any);
          message = `Successfully updated company ID: ${id}`;
          break;
        }

        case 'autotask_search_contacts': {
          // Validate input parameters using Zod schema
          const validation = ContactSchemas.SearchContacts.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_contacts');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 50;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchContacts(validatedArgs as any);

          // Check if results might be truncated
          const isTruncated = result.length >= effectivePageSize && effectivePageSize !== Infinity;

          if (isTruncated) {
            message = `Returning ${result.length} contacts (results may be truncated). To see all results, use pageSize: -1 or add filters (searchTerm, companyID, isActive).`;
          } else {
            message = `Found ${result.length} contacts`;
          }
          break;
        }

        case 'autotask_create_contact': {
          // Validate input parameters using Zod schema
          const validation = ContactSchemas.CreateContact.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_create_contact');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.createContact(validatedArgs as any);
          message = `Successfully created contact with ID: ${result}`;
          break;
        }

        case 'autotask_search_tickets': {
          // Validate input parameters using Zod schema
          const validation = TicketSchemas.SearchTickets.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_tickets');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          // Map parameter names from tool schema to service expectations
          const { companyID, ...otherArgs } = validatedArgs;
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 50;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : requestedPageSize || defaultPageSize;

          const ticketSearchOptions = {
            ...otherArgs,
            ...(companyID !== undefined && { companyId: companyID }),
          };
          result = await this.autotaskService.searchTickets(ticketSearchOptions as any);

          // Check if results might be truncated
          const isTruncated = result.length >= effectivePageSize && effectivePageSize !== Infinity;

          if (isTruncated) {
            message = `Returning ${result.length} tickets (results may be truncated). To see all results, use pageSize: -1 or add filters (searchTerm, companyID, status, assignedResourceID).`;
          } else {
            message = `Found ${result.length} tickets`;
          }
          break;
        }

        case 'autotask_get_ticket_details': {
          // Validate input parameters using Zod schema
          const validation = TicketSchemas.GetTicketDetails.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_get_ticket_details');
          }

          const validatedArgs = validation.data;
          result = await this.autotaskService.getTicket(validatedArgs.ticketID, validatedArgs.fullDetails);
          message = `Ticket details retrieved successfully`;
          break;
        }

        case 'autotask_create_ticket': {
          // Validate input parameters using Zod schema
          const validation = TicketSchemas.CreateTicket.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_create_ticket');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.createTicket(validatedArgs as any);
          message = `Successfully created ticket with ID: ${result}`;
          break;
        }

        case 'autotask_update_ticket': {
          // Validate input parameters using Zod schema
          const validation = TicketSchemas.UpdateTicket.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_update_ticket');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const { ticketId, status, priority, queueID, title, description, resolution, dueDateTime } = validatedArgs;

          // Build update request (include lastActivityDate if it exists in args for backward compatibility)
          const updateRequest = this.removeUndefined({
            id: ticketId as number,
            assignedResourceID: (args as any).assignedResourceID, // Not in schema but might be used
            status,
            priority,
            queueID,
            title,
            description,
            resolution,
            dueDateTime,
            lastActivityDate: (args as any).lastActivityDate, // Not in schema but might be used
          });

          // Ensure metadata cache is initialized before validation (Layer 2)
          await this.autotaskService.ensureMetadataCacheInitialized();

          // Layer 2: Business logic validation using TicketUpdateValidator
          const validator = this.getValidator();
          const validated = validator.validateTicketUpdate(updateRequest as any);

          if (!validated.validation.isValid) {
            const mappedError = ErrorMapper.mapValidationErrors(validated.validation.errors, 'update_ticket');
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ isError: true, error: mappedError }),
                },
              ],
              isError: true,
            };
          }

          try {
            const { id: _ignored, ...updateFields } = validated.payload;
            const updatedTicket = await this.autotaskService.updateTicket(ticketId as number, updateFields);
            result = {
              ticketId,
              updatedFields: Object.keys(updateFields),
              ticket: updatedTicket,
            };
            message = `Ticket ${ticketId} updated successfully`;
          } catch (error) {
            const mappedError = ErrorMapper.mapAutotaskError(error, 'update_ticket');
            this.logger.error(`Ticket update failed [${mappedError.correlationId}]:`, mappedError);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ isError: true, error: mappedError }),
                },
              ],
              isError: true,
            };
          }
          break;
        }

        case 'autotask_create_time_entry': {
          // Validate input parameters using Zod schema
          const validation = TimeSchemas.CreateTimeEntry.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_create_time_entry');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.createTimeEntry(validatedArgs as any);
          message = `Successfully created time entry with ID: ${result}`;
          break;
        }

        // Project tools
        case 'autotask_search_projects': {
          // Validate input parameters using Zod schema
          const validation = ProjectSchemas.SearchProjects.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_projects');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchProjects(validatedArgs as any);

          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;

          if (isTruncated) {
            message = `Returning ${result.length} projects (results may be truncated, API max: 100). Add filters (searchTerm, companyID, status, projectManagerResourceID) to narrow results.`;
          } else {
            message = `Found ${result.length} projects`;
          }
          break;
        }

        case 'autotask_create_project': {
          // Validate input parameters using Zod schema
          const validation = ProjectSchemas.CreateProject.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_create_project');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.createProject(validatedArgs as any);
          message = `Successfully created project with ID: ${result}`;
          break;
        }

        // Resource tools
        case 'autotask_search_resources': {
          // Validate input parameters using Zod schema
          const validation = ResourceSchemas.SearchResources.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_resources');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchResources(validatedArgs as any);

          // Check if results might be truncated
          const isTruncated = result.length >= effectivePageSize && effectivePageSize !== Infinity;

          if (isTruncated) {
            message = `Returning ${result.length} resources (results may be truncated). To see all results, use pageSize: -1 or add filters (searchTerm, isActive, resourceType).`;
          } else {
            message = `Found ${result.length} resources`;
          }
          break;
        }

        // Configuration Item tools
        case 'autotask_search_configuration_items': {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchConfigurationItems(args);

          // Check if results might be truncated
          const isTruncated = result.length >= effectivePageSize && effectivePageSize !== Infinity;

          if (isTruncated) {
            message = `Returning ${result.length} configuration items (results may be truncated). To see all results, use pageSize: -1 or add filters (searchTerm, companyID, isActive, productID).`;
          } else {
            message = `Found ${result.length} configuration items`;
          }
          break;
        }

        // Contract tools
        case 'autotask_search_contracts': {
          // Validate input parameters using Zod schema
          const validation = ContractSchemas.SearchContracts.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_contracts');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchContracts(validatedArgs as any);

          // Check if results might be truncated
          const isTruncated = result.length >= effectivePageSize && effectivePageSize !== Infinity;

          if (isTruncated) {
            message = `Returning ${result.length} contracts (results may be truncated). To see all results, use pageSize: -1 or add filters (searchTerm, companyID, status).`;
          } else {
            message = `Found ${result.length} contracts`;
          }
          break;
        }

        // Invoice tools
        case 'autotask_search_invoices': {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchInvoices(args);

          // Check if results might be truncated
          const isTruncated = result.length >= effectivePageSize && effectivePageSize !== Infinity;

          if (isTruncated) {
            message = `Returning ${result.length} invoices (results may be truncated). To see all results, use pageSize: -1 or add filters (companyID, invoiceNumber, isVoided).`;
          } else {
            message = `Found ${result.length} invoices`;
          }
          break;
        }

        // Task tools
        case 'autotask_search_tasks': {
          // Validate input parameters using Zod schema
          const validation = TaskSchemas.SearchTasks.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_tasks');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchTasks(validatedArgs as any);

          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;

          if (isTruncated) {
            message = `Returning ${result.length} tasks (results may be truncated, API max: 100). Add filters (searchTerm, projectID, status, assignedResourceID) to narrow results.`;
          } else {
            message = `Found ${result.length} tasks`;
          }
          break;
        }

        case 'autotask_create_task': {
          // Validate input parameters using Zod schema
          const validation = TaskSchemas.CreateTask.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_create_task');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.createTask(validatedArgs as any);
          message = `Successfully created task with ID: ${result}`;
          break;
        }

        // Ticket Notes tools
        case 'autotask_get_ticket_note': {
          // Layer 1: Zod structural validation
          const validation = NoteSchemas.GetTicketNote.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_get_ticket_note');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.getTicketNote(
            validatedArgs.ticketId as number,
            validatedArgs.noteId as number,
          );
          message = `Ticket note retrieved successfully`;
          break;
        }

        case 'autotask_search_ticket_notes': {
          // Layer 1: Zod structural validation
          const validation = NoteSchemas.SearchTicketNotes.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_ticket_notes');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchTicketNotes(
            validatedArgs.ticketId as number,
            {
              pageSize: validatedArgs.pageSize,
            } as any,
          );

          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;

          if (isTruncated) {
            message = `Returning ${result.length} ticket notes (results may be truncated, API max: 100). Consider limiting the time range of your query.`;
          } else {
            message = `Found ${result.length} ticket notes`;
          }
          break;
        }

        case 'autotask_create_ticket_note': {
          // Layer 1: Zod structural validation
          const zodValidation = NoteSchemas.CreateTicketNote.safeParse(args);
          if (!zodValidation.success) {
            return this.handleValidationError(zodValidation.error, 'autotask_create_ticket_note');
          }

          const structurallyValid = this.removeUndefined(zodValidation.data);

          // Layer 2: Business logic validation (content sanitization, publish level validation)
          await this.autotaskService.ensureMetadataCacheInitialized();
          const validator = this.getValidator();

          const noteValidation = validator.validateTicketNote({
            ticketID: structurallyValid.ticketId,
            title: structurallyValid.title,
            description: structurallyValid.description,
            publish: structurallyValid.publish,
          } as any);

          if (!noteValidation.validation.isValid) {
            const mappedError = ErrorMapper.mapValidationErrors(noteValidation.validation.errors, 'create_ticket_note');
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ isError: true, error: mappedError }),
                },
              ],
              isError: true,
            };
          }

          // Use validated and sanitized payload
          result = await this.autotaskService.createTicketNote(noteValidation.payload);
          message = `Note created successfully for ticket ${structurallyValid.ticketId}`;
          break;
        }

        // Project Notes tools
        case 'autotask_get_project_note': {
          // Validate input parameters using Zod schema
          const validation = NoteSchemas.GetProjectNote.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_get_project_note');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.getProjectNote(
            validatedArgs.projectId as number,
            validatedArgs.noteId as number,
          );
          message = `Project note retrieved successfully`;
          break;
        }

        case 'autotask_search_project_notes': {
          // Validate input parameters using Zod schema
          const validation = NoteSchemas.SearchProjectNotes.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_project_notes');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchProjectNotes(
            validatedArgs.projectId as number,
            { pageSize: validatedArgs.pageSize } as any,
          );

          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;

          if (isTruncated) {
            message = `Returning ${result.length} project notes (results may be truncated, API max: 100). Consider limiting the time range of your query.`;
          } else {
            message = `Found ${result.length} project notes`;
          }
          break;
        }

        case 'autotask_create_project_note': {
          // Validate input parameters using Zod schema
          const validation = NoteSchemas.CreateProjectNote.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_create_project_note');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.createProjectNote(
            validatedArgs.projectId as number,
            {
              title: validatedArgs.title,
              description: validatedArgs.description,
              noteType: validatedArgs.noteType,
            } as any,
          );
          message = `Successfully created project note with ID: ${result}`;
          break;
        }

        // Company Notes tools
        case 'autotask_get_company_note': {
          // Validate input parameters using Zod schema
          const validation = NoteSchemas.GetCompanyNote.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_get_company_note');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.getCompanyNote(
            validatedArgs.companyId as number,
            validatedArgs.noteId as number,
          );
          message = `Company note retrieved successfully`;
          break;
        }

        case 'autotask_search_company_notes': {
          // Validate input parameters using Zod schema
          const validation = NoteSchemas.SearchCompanyNotes.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_company_notes');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchCompanyNotes(
            validatedArgs.companyId as number,
            { pageSize: validatedArgs.pageSize } as any,
          );

          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;

          if (isTruncated) {
            message = `Returning ${result.length} company notes (results may be truncated, API max: 100). Consider limiting the time range of your query.`;
          } else {
            message = `Found ${result.length} company notes`;
          }
          break;
        }

        case 'autotask_create_company_note': {
          // Validate input parameters using Zod schema
          const validation = NoteSchemas.CreateCompanyNote.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_create_company_note');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.createCompanyNote(
            validatedArgs.companyId as number,
            {
              title: validatedArgs.title,
              description: validatedArgs.description,
              actionType: validatedArgs.actionType,
            } as any,
          );
          message = `Successfully created company note with ID: ${result}`;
          break;
        }

        // Ticket Attachments tools
        case 'autotask_get_ticket_attachment': {
          // Validate input parameters using Zod schema
          const validation = AttachmentSchemas.GetTicketAttachment.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_get_ticket_attachment');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.getTicketAttachment(
            validatedArgs.ticketId as number,
            validatedArgs.attachmentId as number,
            validatedArgs.includeData,
          );
          message = `Ticket attachment retrieved successfully`;
          break;
        }

        case 'autotask_search_ticket_attachments': {
          // Validate input parameters using Zod schema
          const validation = AttachmentSchemas.SearchTicketAttachments.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_ticket_attachments');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 10;
          const effectivePageSize = requestedPageSize || defaultPageSize; // No unlimited mode for attachments

          result = await this.autotaskService.searchTicketAttachments(
            validatedArgs.ticketId as number,
            { pageSize: validatedArgs.pageSize } as any,
          );

          // Check if results might be truncated (max 50, default 10)
          const isTruncated = result.length >= effectivePageSize && effectivePageSize < 50;

          if (isTruncated) {
            message = `Returning ${result.length} ticket attachments (results may be truncated, max: 50). Attachments are large - use small pageSize values.`;
          } else {
            message = `Found ${result.length} ticket attachments`;
          }
          break;
        }

        // Expense Reports tools
        case 'autotask_get_expense_report':
          result = await this.autotaskService.getExpenseReport(args.reportId);
          message = `Expense report retrieved successfully`;
          break;

        case 'autotask_search_expense_reports': {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchExpenseReports({
            submitterId: args.submitterId,
            status: args.status,
            pageSize: args.pageSize,
          });

          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;

          if (isTruncated) {
            message = `Returning ${result.length} expense reports (results may be truncated, API max: 100). Add filters (submitterId, status) to narrow results.`;
          } else {
            message = `Found ${result.length} expense reports`;
          }
          break;
        }

        case 'autotask_create_expense_report':
          result = await this.autotaskService.createExpenseReport({
            name: args.name,
            description: args.description,
            submitterID: args.submitterId,
            weekEndingDate: args.weekEndingDate,
          });
          message = `Successfully created expense report with ID: ${result}`;
          break;

        // Expense Items tools - Not directly supported
        case 'get_expense_item':
        case 'search_expense_items':
        case 'create_expense_item':
          throw new Error('Expense items API not yet implemented - requires child entity handling');

        // Quotes tools
        case 'autotask_get_quote': {
          // Validate input parameters using Zod schema
          const validation = QuoteSchemas.GetQuote.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_get_quote');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.getQuote(validatedArgs.quoteId as number);
          message = `Quote retrieved successfully`;
          break;
        }

        case 'autotask_search_quotes': {
          // Validate input parameters using Zod schema
          const validation = QuoteSchemas.SearchQuotes.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_search_quotes');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          const requestedPageSize = validatedArgs.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : requestedPageSize || defaultPageSize;

          result = await this.autotaskService.searchQuotes(validatedArgs as any);

          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;

          if (isTruncated) {
            message = `Returning ${result.length} quotes (results may be truncated, API max: 100). Add filters (companyId, contactId, opportunityId, searchTerm) to narrow results.`;
          } else {
            message = `Found ${result.length} quotes`;
          }
          break;
        }

        case 'autotask_create_quote': {
          // Validate input parameters using Zod schema
          const validation = QuoteSchemas.CreateQuote.safeParse(args);
          if (!validation.success) {
            return this.handleValidationError(validation.error, 'autotask_create_quote');
          }

          const validatedArgs = this.removeUndefined(validation.data);
          result = await this.autotaskService.createQuote({
            name: validatedArgs.name,
            description: validatedArgs.description,
            companyID: validatedArgs.companyId,
            contactID: validatedArgs.contactId,
            opportunityID: validatedArgs.opportunityId,
            effectiveDate: validatedArgs.effectiveDate,
            expirationDate: validatedArgs.expirationDate,
          } as any);
          message = `Successfully created quote with ID: ${result}`;
          break;
        }

        // Billing Codes and Departments tools - Not directly supported
        case 'get_billing_code':
        case 'search_billing_codes':
        case 'get_department':
        case 'search_departments':
          throw new Error('This entity type is not directly available in the autotask-node library');

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      const toolResult: McpToolResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message,
                data: result,
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      };

      this.logger.debug(`Successfully executed tool: ${name}`);
      return toolResult;
    } catch (error) {
      this.logger.error(`Tool execution failed for ${name}:`, error);

      // Check if error is already a structured error from the service layer
      const hasStructuredError =
        error && typeof error === 'object' && ('code' in error || 'guidance' in error || 'correlationId' in error);

      let mappedError;
      if (hasStructuredError) {
        // Error is already structured from service layer
        mappedError = {
          code: (error as any).code || 'ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          guidance: (error as any).guidance || 'Please try again or contact support.',
          correlationId: (error as any).correlationId,
        };
      } else {
        // Map unstructured error
        mappedError = ErrorMapper.mapAutotaskError(error, name);
      }

      this.logger.error(`Structured error [${mappedError.correlationId}]:`, mappedError);

      const errorResult: McpToolResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                isError: true,
                error: mappedError,
                tool: name,
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };

      return errorResult;
    }
  }

  /**
   * Handle Zod validation errors and format them as MCP tool results (FR-007)
   *
   * Converts Zod validation errors into structured error responses with clear,
   * actionable guidance for LLMs and users. All validation errors include:
   * - Error code (VALIDATION_ERROR)
   * - Human-readable message
   * - Detailed field-level errors
   * - Actionable guidance
   * - Correlation ID for tracking
   *
   * @param error - The Zod validation error from safeParse()
   * @param toolName - The name of the tool being validated
   * @returns MCP tool result with structured error information
   *
   * @example
   * ```typescript
   * const validation = SearchCompaniesInputSchema.safeParse(args);
   * if (!validation.success) {
   *   return this.handleValidationError(validation.error, "autotask_search_companies");
   * }
   * ```
   */
  private handleValidationError(error: ZodError, toolName: string): McpToolResult {
    const validationError = formatZodError(error, toolName);

    this.logger.warn(`Validation error for ${toolName} [${validationError.correlationId}]:`, {
      details: validationError.details,
      guidance: validationError.guidance,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              isError: true,
              error: validationError,
              tool: toolName,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}
