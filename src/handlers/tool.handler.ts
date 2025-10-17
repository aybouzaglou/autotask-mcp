// Autotask Tool Handler
// Handles MCP tool calls for Autotask operations (search, create, update)

import { AutotaskService } from "../services/autotask.service.js";
import { Logger } from "../utils/logger.js";
import { TicketUpdateValidator } from "../services/ticket-update.validator.js";
import { ErrorMapper } from "../utils/error-mapper.js";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface McpToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

// Reusable pageSize parameter schemas for different entity types
const PAGE_SIZE_STANDARD = {
  type: "number",
  description:
    "Number of results (default: 50, max: 500). Use -1 for unlimited (may be slow). Tip: Use filters to narrow results before increasing pageSize.",
  minimum: -1,
  maximum: 500,
};

const PAGE_SIZE_MEDIUM = {
  type: "number",
  description:
    "Number of results (default: 25, max: 500). Use -1 for unlimited (may be slow). Tip: Use filters to narrow results before increasing pageSize.",
  minimum: -1,
  maximum: 500,
};

const PAGE_SIZE_LIMITED = {
  type: "number",
  description:
    "Number of results (default: 25, max: 100). Use -1 for up to 100 results. Note: This endpoint has API limitations.",
  minimum: -1,
  maximum: 100,
};

const PAGE_SIZE_ATTACHMENTS = {
  type: "number",
  description:
    "Number of results (default: 10, max: 50). Attachments are large binary objects - use small pageSizes to manage response size.",
  minimum: 1,
  maximum: 50,
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
   * List all available tools
   */
  async listTools(): Promise<McpTool[]> {
    this.logger.debug("Listing available Autotask tools");

    const tools: McpTool[] = [
      // Connection testing
      {
        name: "test_connection",
        description: "Test the connection to Autotask API",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },

      // Company tools
      {
        name: "search_companies",
        description:
          "Search for companies in Autotask. Returns 50 companies by default. Use filters (searchTerm, isActive) to narrow results before requesting more data.",
        inputSchema: {
          type: "object",
          properties: {
            searchTerm: {
              type: "string",
              description: "Search term for company name",
            },
            isActive: {
              type: "boolean",
              description: "Filter by active status",
            },
            pageSize: PAGE_SIZE_STANDARD,
          },
          required: [],
        },
      },
      {
        name: "create_company",
        description: "Create a new company in Autotask",
        inputSchema: {
          type: "object",
          properties: {
            companyName: {
              type: "string",
              description: "Company name",
            },
            companyType: {
              type: "number",
              description: "Company type ID",
            },
            phone: {
              type: "string",
              description: "Company phone number",
            },
            address1: {
              type: "string",
              description: "Company address line 1",
            },
            city: {
              type: "string",
              description: "Company city",
            },
            state: {
              type: "string",
              description: "Company state/province",
            },
            postalCode: {
              type: "string",
              description: "Company postal/ZIP code",
            },
            ownerResourceID: {
              type: "number",
              description: "Owner resource ID",
            },
            isActive: {
              type: "boolean",
              description: "Whether the company is active",
            },
          },
          required: ["companyName", "companyType"],
        },
      },
      {
        name: "update_company",
        description: "Update an existing company in Autotask",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "Company ID to update",
            },
            companyName: {
              type: "string",
              description: "Company name",
            },
            phone: {
              type: "string",
              description: "Company phone number",
            },
            address1: {
              type: "string",
              description: "Company address line 1",
            },
            city: {
              type: "string",
              description: "Company city",
            },
            state: {
              type: "string",
              description: "Company state/province",
            },
            postalCode: {
              type: "string",
              description: "Company postal/ZIP code",
            },
            isActive: {
              type: "boolean",
              description: "Whether the company is active",
            },
          },
          required: ["id"],
        },
      },

      // Contact tools
      {
        name: "search_contacts",
        description:
          "Search for contacts in Autotask. Returns 50 contacts by default. Use filters (searchTerm, companyID, isActive) to narrow results before requesting more data.",
        inputSchema: {
          type: "object",
          properties: {
            searchTerm: {
              type: "string",
              description: "Search term for contact name or email",
            },
            companyID: {
              type: "number",
              description: "Filter by company ID",
            },
            isActive: {
              type: "number",
              description: "Filter by active status (1=active, 0=inactive)",
            },
            pageSize: PAGE_SIZE_STANDARD,
          },
          required: [],
        },
      },
      {
        name: "create_contact",
        description: "Create a new contact in Autotask",
        inputSchema: {
          type: "object",
          properties: {
            companyID: {
              type: "number",
              description: "Company ID for the contact",
            },
            firstName: {
              type: "string",
              description: "Contact first name",
            },
            lastName: {
              type: "string",
              description: "Contact last name",
            },
            emailAddress: {
              type: "string",
              description: "Contact email address",
            },
            phone: {
              type: "string",
              description: "Contact phone number",
            },
            title: {
              type: "string",
              description: "Contact job title",
            },
          },
          required: ["companyID", "firstName", "lastName"],
        },
      },

      // Ticket tools
      {
        name: "search_tickets",
        description:
          "Search for tickets in Autotask. Returns 50 optimized tickets by default. Use filters (searchTerm, companyID, status, assignedResourceID) to narrow results. For full ticket data, use get_ticket_details.",
        inputSchema: {
          type: "object",
          properties: {
            searchTerm: {
              type: "string",
              description: "Search term for ticket title or description",
            },
            companyID: {
              type: "number",
              description: "Filter by company ID",
            },
            status: {
              type: "number",
              description:
                "Filter by ticket status ID (omit for all open tickets: status < 5)",
            },
            assignedResourceID: {
              type: "number",
              description:
                "Filter by assigned resource ID. Use null (or omit) to search for unassigned tickets.",
            },
            unassigned: {
              type: "boolean",
              description:
                "Set to true to find tickets that are not assigned to any resource (where assignedResourceID is null)",
            },
            pageSize: PAGE_SIZE_STANDARD,
          },
          required: [],
        },
      },
      {
        name: "get_ticket_details",
        description:
          "Get detailed information for a specific ticket by ID. Use this for full ticket data when needed.",
        inputSchema: {
          type: "object",
          properties: {
            ticketID: {
              type: "number",
              description: "Ticket ID to retrieve",
            },
            fullDetails: {
              type: "boolean",
              description:
                "Whether to return full ticket details (default: false for optimized data)",
              default: false,
            },
          },
          required: ["ticketID"],
        },
      },
      {
        name: "create_ticket",
        description: "Create a new ticket in Autotask",
        inputSchema: {
          type: "object",
          properties: {
            companyID: {
              type: "number",
              description: "Company ID for the ticket",
            },
            title: {
              type: "string",
              description: "Ticket title",
            },
            description: {
              type: "string",
              description: "Ticket description",
            },
            status: {
              type: "number",
              description: "Ticket status ID",
            },
            priority: {
              type: "number",
              description: "Ticket priority ID",
            },
            assignedResourceID: {
              type: "number",
              description: "Assigned resource ID",
            },
            contactID: {
              type: "number",
              description: "Contact ID for the ticket",
            },
          },
          required: ["companyID", "title", "description"],
        },
      },
      {
        name: "update_ticket",
        description:
          "Update an existing ticket in Autotask using PATCH semantics for core fields",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: {
              type: "number",
              description: "Ticket ID to update",
            },
            status: {
              type: "number",
              description: "Ticket status ID to apply",
            },
            priority: {
              type: "number",
              description: "Ticket priority ID to apply",
            },
            queueID: {
              type: "number",
              description: "Queue ID for routing the ticket",
            },
            dueDateTime: {
              type: "string",
              description:
                "ISO 8601 due date/time (e.g., 2025-09-17T16:30:00Z)",
            },
            title: {
              type: "string",
              description: "Ticket title/summary",
            },
            description: {
              type: "string",
              description: "Ticket description/body",
            },
            resolution: {
              type: "string",
              description: "Resolution notes to append/update",
            },
          },
          required: ["ticketId"],
        },
      },

      // Time entry tools
      {
        name: "create_time_entry",
        description: "Create a time entry in Autotask",
        inputSchema: {
          type: "object",
          properties: {
            ticketID: {
              type: "number",
              description: "Ticket ID for the time entry",
            },
            taskID: {
              type: "number",
              description:
                "Task ID for the time entry (optional, for project work)",
            },
            resourceID: {
              type: "number",
              description: "Resource ID (user) logging the time",
            },
            dateWorked: {
              type: "string",
              description: "Date worked (YYYY-MM-DD format)",
            },
            startDateTime: {
              type: "string",
              description: "Start date/time (ISO format)",
            },
            endDateTime: {
              type: "string",
              description: "End date/time (ISO format)",
            },
            hoursWorked: {
              type: "number",
              description: "Number of hours worked",
            },
            summaryNotes: {
              type: "string",
              description: "Summary notes for the time entry",
            },
            internalNotes: {
              type: "string",
              description: "Internal notes for the time entry",
            },
          },
          required: ["resourceID", "dateWorked", "hoursWorked", "summaryNotes"],
        },
      },

      // Project tools
      {
        name: "search_projects",
        description:
          "Search for projects in Autotask. Returns 25 optimized projects by default (API limited to max 100). Use filters (searchTerm, companyID, status) to narrow results.",
        inputSchema: {
          type: "object",
          properties: {
            searchTerm: {
              type: "string",
              description: "Search term for project name",
            },
            companyID: {
              type: "number",
              description: "Filter by company ID",
            },
            status: {
              type: "number",
              description: "Filter by project status",
            },
            projectManagerResourceID: {
              type: "number",
              description: "Filter by project manager resource ID",
            },
            pageSize: PAGE_SIZE_LIMITED,
          },
          required: [],
        },
      },
      {
        name: "create_project",
        description: "Create a new project in Autotask",
        inputSchema: {
          type: "object",
          properties: {
            companyID: {
              type: "number",
              description: "Company ID for the project",
            },
            projectName: {
              type: "string",
              description: "Project name",
            },
            description: {
              type: "string",
              description: "Project description",
            },
            status: {
              type: "number",
              description: "Project status (1=New, 2=In Progress, 5=Complete)",
            },
            startDate: {
              type: "string",
              description: "Project start date (YYYY-MM-DD)",
            },
            endDate: {
              type: "string",
              description: "Project end date (YYYY-MM-DD)",
            },
            projectManagerResourceID: {
              type: "number",
              description: "Project manager resource ID",
            },
            estimatedHours: {
              type: "number",
              description: "Estimated hours for the project",
            },
          },
          required: ["companyID", "projectName", "status"],
        },
      },

      // Resource tools
      {
        name: "search_resources",
        description:
          "Search for resources (users) in Autotask. Returns 25 resources by default. Use filters (searchTerm, isActive, resourceType) to narrow results before requesting more data.",
        inputSchema: {
          type: "object",
          properties: {
            searchTerm: {
              type: "string",
              description: "Search term for resource name or email",
            },
            isActive: {
              type: "boolean",
              description: "Filter by active status",
            },
            resourceType: {
              type: "number",
              description:
                "Filter by resource type (1=Employee, 2=Contractor, 3=Temporary)",
            },
            pageSize: PAGE_SIZE_MEDIUM,
          },
          required: [],
        },
      },

      // =====================================================
      // NEW TOOLS - Phase 1: High-Priority Entity Support
      // =====================================================

      // Ticket Notes tools
      {
        name: "get_ticket_note",
        description: "Get a specific ticket note by ticket ID and note ID",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: {
              type: "number",
              description: "The ticket ID",
            },
            noteId: {
              type: "number",
              description: "The note ID to retrieve",
            },
          },
          required: ["ticketId", "noteId"],
        },
      },
      {
        name: "search_ticket_notes",
        description:
          "Search for notes on a specific ticket. Returns 25 notes by default (max: 100).",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: {
              type: "number",
              description: "The ticket ID to search notes for",
            },
            pageSize: PAGE_SIZE_LIMITED,
          },
          required: ["ticketId"],
        },
      },
      {
        name: "create_ticket_note",
        description: "Create a new note for a ticket",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: {
              type: "number",
              description: "The ticket ID to add the note to",
            },
            title: {
              type: "string",
              description: "Note title",
            },
            description: {
              type: "string",
              description: "Note content",
            },
            noteType: {
              type: "number",
              description:
                "Note type (1=General, 2=Appointment, 3=Task, 4=Ticket, 5=Project, 6=Opportunity)",
            },
            publish: {
              type: "number",
              description:
                "Publish level (1=Internal Only, 2=All Autotask Users, 3=Everyone)",
            },
          },
          required: ["ticketId", "description"],
        },
      },

      // Project Notes tools
      {
        name: "get_project_note",
        description: "Get a specific project note by project ID and note ID",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "number",
              description: "The project ID",
            },
            noteId: {
              type: "number",
              description: "The note ID to retrieve",
            },
          },
          required: ["projectId", "noteId"],
        },
      },
      {
        name: "search_project_notes",
        description:
          "Search for notes on a specific project. Returns 25 notes by default (max: 100).",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "number",
              description: "The project ID to search notes for",
            },
            pageSize: PAGE_SIZE_LIMITED,
          },
          required: ["projectId"],
        },
      },
      {
        name: "create_project_note",
        description: "Create a new note for a project",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "number",
              description: "The project ID to add the note to",
            },
            title: {
              type: "string",
              description: "Note title",
            },
            description: {
              type: "string",
              description: "Note content",
            },
            noteType: {
              type: "number",
              description:
                "Note type (1=General, 2=Appointment, 3=Task, 4=Ticket, 5=Project, 6=Opportunity)",
            },
          },
          required: ["projectId", "description"],
        },
      },

      // Company Notes tools
      {
        name: "get_company_note",
        description: "Get a specific company note by company ID and note ID",
        inputSchema: {
          type: "object",
          properties: {
            companyId: {
              type: "number",
              description: "The company ID",
            },
            noteId: {
              type: "number",
              description: "The note ID to retrieve",
            },
          },
          required: ["companyId", "noteId"],
        },
      },
      {
        name: "search_company_notes",
        description:
          "Search for notes on a specific company. Returns 25 notes by default (max: 100).",
        inputSchema: {
          type: "object",
          properties: {
            companyId: {
              type: "number",
              description: "The company ID to search notes for",
            },
            pageSize: PAGE_SIZE_LIMITED,
          },
          required: ["companyId"],
        },
      },
      {
        name: "create_company_note",
        description: "Create a new note for a company",
        inputSchema: {
          type: "object",
          properties: {
            companyId: {
              type: "number",
              description: "The company ID to add the note to",
            },
            title: {
              type: "string",
              description: "Note title",
            },
            description: {
              type: "string",
              description: "Note content",
            },
            actionType: {
              type: "number",
              description: "Action type for the note",
            },
          },
          required: ["companyId", "description"],
        },
      },

      // Ticket Attachments tools
      {
        name: "search_ticket_attachments",
        description:
          "Search for attachments on a specific ticket. Returns 10 attachments by default (max: 50). Attachments can be large.",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: {
              type: "number",
              description: "The ticket ID to search attachments for",
            },
            pageSize: PAGE_SIZE_ATTACHMENTS,
          },
          required: ["ticketId"],
        },
      },
      {
        name: "get_ticket_attachment",
        description:
          "Get a specific ticket attachment by ticket ID and attachment ID",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: {
              type: "number",
              description: "The ticket ID",
            },
            attachmentId: {
              type: "number",
              description: "The attachment ID to retrieve",
            },
            includeData: {
              type: "boolean",
              description:
                "Whether to include base64 encoded file data (default: false)",
              default: false,
            },
          },
          required: ["ticketId", "attachmentId"],
        },
      },

      // Expense Reports tools
      {
        name: "get_expense_report",
        description: "Get a specific expense report by ID",
        inputSchema: {
          type: "object",
          properties: {
            reportId: {
              type: "number",
              description: "The expense report ID to retrieve",
            },
          },
          required: ["reportId"],
        },
      },
      {
        name: "search_expense_reports",
        description:
          "Search for expense reports. Returns 25 reports by default (max: 100). Use filters (submitterId, status) to narrow results.",
        inputSchema: {
          type: "object",
          properties: {
            submitterId: {
              type: "number",
              description: "Filter by submitter resource ID",
            },
            status: {
              type: "number",
              description:
                "Filter by status (1=New, 2=Submitted, 3=Approved, 4=Paid, 5=Rejected, 6=InReview)",
            },
            pageSize: PAGE_SIZE_LIMITED,
          },
          required: [],
        },
      },
      {
        name: "create_expense_report",
        description: "Create a new expense report",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Expense report name",
            },
            description: {
              type: "string",
              description: "Expense report description",
            },
            submitterId: {
              type: "number",
              description: "The resource ID of the submitter",
            },
            weekEndingDate: {
              type: "string",
              description: "Week ending date (YYYY-MM-DD format)",
            },
          },
          required: ["submitterId"],
        },
      },

      // Quotes tools
      {
        name: "get_quote",
        description: "Get a specific quote by ID",
        inputSchema: {
          type: "object",
          properties: {
            quoteId: {
              type: "number",
              description: "The quote ID to retrieve",
            },
          },
          required: ["quoteId"],
        },
      },
      {
        name: "search_quotes",
        description:
          "Search for quotes. Returns 25 quotes by default (max: 100). Use filters (companyId, contactId, opportunityId, searchTerm) to narrow results.",
        inputSchema: {
          type: "object",
          properties: {
            companyId: {
              type: "number",
              description: "Filter by company ID",
            },
            contactId: {
              type: "number",
              description: "Filter by contact ID",
            },
            opportunityId: {
              type: "number",
              description: "Filter by opportunity ID",
            },
            searchTerm: {
              type: "string",
              description: "Search term for quote name or description",
            },
            pageSize: PAGE_SIZE_LIMITED,
          },
          required: [],
        },
      },
      {
        name: "create_quote",
        description: "Create a new quote",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Quote name",
            },
            description: {
              type: "string",
              description: "Quote description",
            },
            companyId: {
              type: "number",
              description: "Company ID for the quote",
            },
            contactId: {
              type: "number",
              description: "Contact ID for the quote",
            },
            opportunityId: {
              type: "number",
              description: "Associated opportunity ID",
            },
            effectiveDate: {
              type: "string",
              description: "Effective date (YYYY-MM-DD format)",
            },
            expirationDate: {
              type: "string",
              description: "Expiration date (YYYY-MM-DD format)",
            },
          },
          required: ["companyId"],
        },
      },

      // Configuration Item tools
      {
        name: "search_configuration_items",
        description:
          "Search for configuration items (assets) in Autotask. Returns 25 items by default. Use filters (searchTerm, companyID, isActive, productID) to narrow results.",
        inputSchema: {
          type: "object",
          properties: {
            searchTerm: {
              type: "string",
              description: "Search term for configuration item name",
            },
            companyID: {
              type: "number",
              description: "Filter by company ID",
            },
            isActive: {
              type: "boolean",
              description: "Filter by active status",
            },
            productID: {
              type: "number",
              description: "Filter by product ID",
            },
            pageSize: PAGE_SIZE_MEDIUM,
          },
          required: [],
        },
      },

      // Contract tools
      {
        name: "search_contracts",
        description:
          "Search for contracts in Autotask. Returns 25 contracts by default. Use filters (searchTerm, companyID, status) to narrow results before requesting more data.",
        inputSchema: {
          type: "object",
          properties: {
            searchTerm: {
              type: "string",
              description: "Search term for contract name",
            },
            companyID: {
              type: "number",
              description: "Filter by company ID",
            },
            status: {
              type: "number",
              description:
                "Filter by contract status (1=In Effect, 3=Terminated)",
            },
            pageSize: PAGE_SIZE_MEDIUM,
          },
          required: [],
        },
      },

      // Invoice tools
      {
        name: "search_invoices",
        description:
          "Search for invoices in Autotask. Returns 25 invoices by default. Use filters (companyID, invoiceNumber, isVoided) to narrow results before requesting more data.",
        inputSchema: {
          type: "object",
          properties: {
            companyID: {
              type: "number",
              description: "Filter by company ID",
            },
            invoiceNumber: {
              type: "string",
              description: "Filter by invoice number",
            },
            isVoided: {
              type: "boolean",
              description: "Filter by voided status",
            },
            pageSize: PAGE_SIZE_MEDIUM,
          },
          required: [],
        },
      },

      // Task tools
      {
        name: "search_tasks",
        description:
          "Search for tasks in Autotask. Returns 25 optimized tasks by default (API limited to max 100). Use filters (searchTerm, projectID, status, assignedResourceID) to narrow results.",
        inputSchema: {
          type: "object",
          properties: {
            searchTerm: {
              type: "string",
              description: "Search term for task title",
            },
            projectID: {
              type: "number",
              description: "Filter by project ID",
            },
            status: {
              type: "number",
              description:
                "Filter by task status (1=New, 2=In Progress, 5=Complete)",
            },
            assignedResourceID: {
              type: "number",
              description: "Filter by assigned resource ID",
            },
            pageSize: PAGE_SIZE_LIMITED,
          },
          required: [],
        },
      },
      {
        name: "create_task",
        description: "Create a new task in Autotask",
        inputSchema: {
          type: "object",
          properties: {
            projectID: {
              type: "number",
              description: "Project ID for the task",
            },
            title: {
              type: "string",
              description: "Task title",
            },
            description: {
              type: "string",
              description: "Task description",
            },
            status: {
              type: "number",
              description: "Task status (1=New, 2=In Progress, 5=Complete)",
            },
            assignedResourceID: {
              type: "number",
              description: "Assigned resource ID",
            },
            estimatedHours: {
              type: "number",
              description: "Estimated hours for the task",
            },
            startDateTime: {
              type: "string",
              description: "Task start date/time (ISO format)",
            },
            endDateTime: {
              type: "string",
              description: "Task end date/time (ISO format)",
            },
          },
          required: ["projectID", "title", "status"],
        },
      },
    ];

    this.logger.debug(`Listed ${tools.length} available tools`);
    return tools;
  }

  /**
   * Call a tool with the given arguments
   */
  async callTool(
    name: string,
    args: Record<string, any>,
  ): Promise<McpToolResult> {
    this.logger.debug(`Calling tool: ${name}`, args);

    try {
      let result: any;
      let message: string;

      switch (name) {
        case "test_connection": {
          const connectionResult = await this.autotaskService.testConnection();
          result = { success: connectionResult };
          message = connectionResult
            ? "Successfully connected to Autotask API"
            : "Connection failed: Unable to connect to Autotask API";
          break;
        }

        case "search_companies": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 50;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : (requestedPageSize || defaultPageSize);
          
          result = await this.autotaskService.searchCompanies(args);
          
          // Check if results might be truncated
          const isTruncated = result.length >= effectivePageSize && effectivePageSize !== Infinity;
          
          if (isTruncated) {
            message = `Returning ${result.length} companies (results may be truncated). To see all results, use pageSize: -1 or add filters (searchTerm, isActive).`;
          } else {
            message = `Found ${result.length} companies`;
          }
          break;
        }

        case "create_company":
          result = await this.autotaskService.createCompany(args);
          message = `Successfully created company with ID: ${result}`;
          break;

        case "update_company":
          result = await this.autotaskService.updateCompany(args.id, args);
          message = `Successfully updated company ID: ${args.id}`;
          break;

        case "search_contacts": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 50;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : (requestedPageSize || defaultPageSize);
          
          result = await this.autotaskService.searchContacts(args);
          
          // Check if results might be truncated
          const isTruncated = result.length >= effectivePageSize && effectivePageSize !== Infinity;
          
          if (isTruncated) {
            message = `Returning ${result.length} contacts (results may be truncated). To see all results, use pageSize: -1 or add filters (searchTerm, companyID, isActive).`;
          } else {
            message = `Found ${result.length} contacts`;
          }
          break;
        }

        case "create_contact":
          result = await this.autotaskService.createContact(args);
          message = `Successfully created contact with ID: ${result}`;
          break;

        case "search_tickets": {
          // Map parameter names from tool schema to service expectations
          const { companyID, ...otherArgs } = args;
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 50;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : (requestedPageSize || defaultPageSize);
          
          const ticketSearchOptions = {
            ...otherArgs,
            ...(companyID !== undefined && { companyId: companyID }),
          };
          result =
            await this.autotaskService.searchTickets(ticketSearchOptions);
          
          // Check if results might be truncated
          const isTruncated = result.length >= effectivePageSize && effectivePageSize !== Infinity;
          
          if (isTruncated) {
            message = `Returning ${result.length} tickets (results may be truncated). To see all results, use pageSize: -1 or add filters (searchTerm, companyID, status, assignedResourceID).`;
          } else {
            message = `Found ${result.length} tickets`;
          }
          break;
        }

        case "get_ticket_details":
          result = await this.autotaskService.getTicket(
            args.ticketID,
            args.fullDetails,
          );
          message = `Ticket details retrieved successfully`;
          break;

        case "create_ticket":
          result = await this.autotaskService.createTicket(args);
          message = `Successfully created ticket with ID: ${result}`;
          break;

        case "update_ticket": {
          const {
            ticketId,
            assignedResourceID,
            status,
            priority,
            queueID,
            title,
            description,
            resolution,
            dueDateTime,
            lastActivityDate,
          } = args;

          // Validate ticket ID
          if (
            ticketId === undefined ||
            typeof ticketId !== "number" ||
            Number.isNaN(ticketId)
          ) {
            const mappedError = ErrorMapper.mapGenericError(
              "ticketId is required and must be a number",
              "INVALID_TICKET_ID",
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ isError: true, error: mappedError }),
                },
              ],
              isError: true,
            };
          }

          // Build update request
          const updateRequest = {
            id: ticketId,
            assignedResourceID,
            status,
            priority,
            queueID,
            title,
            description,
            resolution,
            dueDateTime,
            lastActivityDate,
          };

          // Ensure metadata cache is initialized before validation
          await this.autotaskService.ensureMetadataCacheInitialized();

          // Validate using the validator
          const validator = this.getValidator();
          const validated = validator.validateTicketUpdate(updateRequest);

          if (!validated.validation.isValid) {
            const mappedError = ErrorMapper.mapValidationErrors(
              validated.validation.errors,
              "update_ticket",
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ isError: true, error: mappedError }),
                },
              ],
              isError: true,
            };
          }

          try {
            const { id: _ignored, ...updateFields } = validated.payload;
            const updatedTicket = await this.autotaskService.updateTicket(
              ticketId,
              updateFields,
            );
            result = {
              ticketId,
              updatedFields: Object.keys(updateFields),
              ticket: updatedTicket,
            };
            message = `Ticket ${ticketId} updated successfully`;
          } catch (error) {
            const mappedError = ErrorMapper.mapAutotaskError(
              error,
              "update_ticket",
            );
            this.logger.error(
              `Ticket update failed [${mappedError.correlationId}]:`,
              mappedError,
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ isError: true, error: mappedError }),
                },
              ],
              isError: true,
            };
          }
          break;
        }

        case "create_time_entry":
          result = await this.autotaskService.createTimeEntry(args);
          message = `Successfully created time entry with ID: ${result}`;
          break;

        // Project tools
        case "search_projects": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : (requestedPageSize || defaultPageSize);
          
          result = await this.autotaskService.searchProjects(args);
          
          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;
          
          if (isTruncated) {
            message = `Returning ${result.length} projects (results may be truncated, API max: 100). Add filters (searchTerm, companyID, status, projectManagerResourceID) to narrow results.`;
          } else {
            message = `Found ${result.length} projects`;
          }
          break;
        }

        case "create_project":
          result = await this.autotaskService.createProject(args);
          message = `Successfully created project with ID: ${result}`;
          break;

        // Resource tools
        case "search_resources": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : (requestedPageSize || defaultPageSize);
          
          result = await this.autotaskService.searchResources(args);
          
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
        case "search_configuration_items": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : (requestedPageSize || defaultPageSize);
          
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
        case "search_contracts": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : (requestedPageSize || defaultPageSize);
          
          result = await this.autotaskService.searchContracts(args);
          
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
        case "search_invoices": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? Infinity : (requestedPageSize || defaultPageSize);
          
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
        case "search_tasks": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : (requestedPageSize || defaultPageSize);
          
          result = await this.autotaskService.searchTasks(args);
          
          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;
          
          if (isTruncated) {
            message = `Returning ${result.length} tasks (results may be truncated, API max: 100). Add filters (searchTerm, projectID, status, assignedResourceID) to narrow results.`;
          } else {
            message = `Found ${result.length} tasks`;
          }
          break;
        }

        case "create_task":
          result = await this.autotaskService.createTask(args);
          message = `Successfully created task with ID: ${result}`;
          break;

        // Ticket Notes tools
        case "get_ticket_note":
          result = await this.autotaskService.getTicketNote(
            args.ticketId,
            args.noteId,
          );
          message = `Ticket note retrieved successfully`;
          break;

        case "search_ticket_notes": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : (requestedPageSize || defaultPageSize);
          
          result = await this.autotaskService.searchTicketNotes(args.ticketId, {
            pageSize: args.pageSize,
          });
          
          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;
          
          if (isTruncated) {
            message = `Returning ${result.length} ticket notes (results may be truncated, API max: 100). Consider limiting the time range of your query.`;
          } else {
            message = `Found ${result.length} ticket notes`;
          }
          break;
        }

        case "create_ticket_note": {
          // Ensure metadata cache is initialized before validation
          await this.autotaskService.ensureMetadataCacheInitialized();

          // Validate note payload using validator
          const validator = this.getValidator();

          const noteValidation = validator.validateTicketNote({
            ticketID: args.ticketId,
            title: args.title,
            description: args.description,
            publish: args.publish,
          });

          if (!noteValidation.validation.isValid) {
            const mappedError = ErrorMapper.mapValidationErrors(
              noteValidation.validation.errors,
              "create_ticket_note",
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ isError: true, error: mappedError }),
                },
              ],
              isError: true,
            };
          }

          // Use validated and sanitized payload
          result = await this.autotaskService.createTicketNote(
            noteValidation.payload,
          );
          message = `Note created successfully for ticket ${args.ticketId}`;
          break;
        }

        // Project Notes tools
        case "get_project_note":
          result = await this.autotaskService.getProjectNote(
            args.projectId,
            args.noteId,
          );
          message = `Project note retrieved successfully`;
          break;

        case "search_project_notes": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : (requestedPageSize || defaultPageSize);
          
          result = await this.autotaskService.searchProjectNotes(
            args.projectId,
            { pageSize: args.pageSize },
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

        case "create_project_note":
          result = await this.autotaskService.createProjectNote(
            args.projectId,
            {
              title: args.title,
              description: args.description,
              noteType: args.noteType,
            },
          );
          message = `Successfully created project note with ID: ${result}`;
          break;

        // Company Notes tools
        case "get_company_note":
          result = await this.autotaskService.getCompanyNote(
            args.companyId,
            args.noteId,
          );
          message = `Company note retrieved successfully`;
          break;

        case "search_company_notes": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : (requestedPageSize || defaultPageSize);
          
          result = await this.autotaskService.searchCompanyNotes(
            args.companyId,
            { pageSize: args.pageSize },
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

        case "create_company_note":
          result = await this.autotaskService.createCompanyNote(
            args.companyId,
            {
              title: args.title,
              description: args.description,
              actionType: args.actionType,
            },
          );
          message = `Successfully created company note with ID: ${result}`;
          break;

        // Ticket Attachments tools
        case "get_ticket_attachment":
          result = await this.autotaskService.getTicketAttachment(
            args.ticketId,
            args.attachmentId,
            args.includeData,
          );
          message = `Ticket attachment retrieved successfully`;
          break;

        case "search_ticket_attachments": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 10;
          const effectivePageSize = requestedPageSize || defaultPageSize; // No unlimited mode for attachments
          
          result = await this.autotaskService.searchTicketAttachments(
            args.ticketId,
            { pageSize: args.pageSize },
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
        case "get_expense_report":
          result = await this.autotaskService.getExpenseReport(args.reportId);
          message = `Expense report retrieved successfully`;
          break;

        case "search_expense_reports": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : (requestedPageSize || defaultPageSize);
          
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

        case "create_expense_report":
          result = await this.autotaskService.createExpenseReport({
            name: args.name,
            description: args.description,
            submitterID: args.submitterId,
            weekEndingDate: args.weekEndingDate,
          });
          message = `Successfully created expense report with ID: ${result}`;
          break;

        // Expense Items tools - Not directly supported
        case "get_expense_item":
        case "search_expense_items":
        case "create_expense_item":
          throw new Error(
            "Expense items API not yet implemented - requires child entity handling",
          );

        // Quotes tools
        case "get_quote":
          result = await this.autotaskService.getQuote(args.quoteId);
          message = `Quote retrieved successfully`;
          break;

        case "search_quotes": {
          const requestedPageSize = args.pageSize;
          const defaultPageSize = 25;
          const effectivePageSize = requestedPageSize === -1 ? 100 : (requestedPageSize || defaultPageSize);
          
          result = await this.autotaskService.searchQuotes({
            companyId: args.companyId,
            contactId: args.contactId,
            opportunityId: args.opportunityId,
            searchTerm: args.searchTerm,
            pageSize: args.pageSize,
          });
          
          // Check if results might be truncated (LIMITED endpoint - max 100)
          const isTruncated = result.length >= effectivePageSize;
          
          if (isTruncated) {
            message = `Returning ${result.length} quotes (results may be truncated, API max: 100). Add filters (companyId, contactId, opportunityId, searchTerm) to narrow results.`;
          } else {
            message = `Found ${result.length} quotes`;
          }
          break;
        }

        case "create_quote":
          result = await this.autotaskService.createQuote({
            name: args.name,
            description: args.description,
            companyID: args.companyId,
            contactID: args.contactId,
            opportunityID: args.opportunityId,
            effectiveDate: args.effectiveDate,
            expirationDate: args.expirationDate,
          });
          message = `Successfully created quote with ID: ${result}`;
          break;

        // Billing Codes and Departments tools - Not directly supported
        case "get_billing_code":
        case "search_billing_codes":
        case "get_department":
        case "search_departments":
          throw new Error(
            "This entity type is not directly available in the autotask-node library",
          );

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      const toolResult: McpToolResult = {
        content: [
          {
            type: "text",
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
        error &&
        typeof error === "object" &&
        ("code" in error || "guidance" in error || "correlationId" in error);

      let mappedError;
      if (hasStructuredError) {
        // Error is already structured from service layer
        mappedError = {
          code: (error as any).code || "ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          guidance:
            (error as any).guidance || "Please try again or contact support.",
          correlationId: (error as any).correlationId,
        };
      } else {
        // Map unstructured error
        mappedError = ErrorMapper.mapAutotaskError(error, name);
      }

      this.logger.error(
        `Structured error [${mappedError.correlationId}]:`,
        mappedError,
      );

      const errorResult: McpToolResult = {
        content: [
          {
            type: "text",
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
}
