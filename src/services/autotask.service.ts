// Autotask Service Layer
// Wraps the autotask-node client with our specific types and error handling

import { AutotaskClient } from 'autotask-node';
import {
  AutotaskCompany,
  AutotaskContact,
  AutotaskTicket,
  AutotaskTimeEntry,
  AutotaskProject,
  AutotaskResource,
  AutotaskConfigurationItem,
  AutotaskContract,
  AutotaskInvoice,
  AutotaskTask,
  AutotaskQueryOptions,
  AutotaskTicketNote,
  AutotaskProjectNote,
  AutotaskCompanyNote,
  AutotaskTicketAttachment,
  AutotaskExpenseReport,
  AutotaskExpenseItem,
  AutotaskQuote,
  AutotaskBillingCode,
  AutotaskDepartment,
  AutotaskQueryOptionsExtended,
  TicketUpdateFields,
} from '../types/autotask';
import { McpServerConfig } from '../types/mcp';
import { Logger } from '../utils/logger';
import { TicketMetadataCache } from './ticket-metadata.cache.js';
import { ErrorMapper } from '../utils/error-mapper.js';

export class AutotaskService {
  private client: AutotaskClient | null = null;
  private logger: Logger;
  private config: McpServerConfig;
  private initializationPromise: Promise<void> | null = null;
  private metadataCache: TicketMetadataCache;

  constructor(config: McpServerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.metadataCache = new TicketMetadataCache(logger);
  }

  /**
   * Initialize the Autotask client with credentials
   */
  async initialize(): Promise<void> {
    try {
      const { username, secret, integrationCode, apiUrl } = this.config.autotask;

      if (!username || !secret || !integrationCode) {
        throw new Error('Missing required Autotask credentials: username, secret, and integrationCode are required');
      }

      this.logger.info('Initializing Autotask client...');

      // Only include apiUrl if it's defined
      const authConfig: any = {
        username,
        secret,
        integrationCode,
      };

      if (apiUrl) {
        authConfig.apiUrl = apiUrl;
      }

      this.client = await AutotaskClient.create(authConfig);

      this.logger.info('Autotask client initialized successfully');

      // Initialize metadata cache
      this.metadataCache.setClient(this.client);
      await this.metadataCache.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize Autotask client:', error);
      throw error;
    }
  }

  /**
   * Ensure client is initialized (with lazy initialization)
   */
  private async ensureClient(): Promise<AutotaskClient> {
    if (!this.client) {
      await this.ensureInitialized();
    }
    return this.client!;
  }

  /**
   * Ensure the client is initialized, handling concurrent calls
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      // Already initializing, wait for it to complete
      await this.initializationPromise;
      return;
    }

    if (this.client) {
      // Already initialized
      return;
    }

    // Start initialization
    this.initializationPromise = this.initialize();
    await this.initializationPromise;
  }

  /**
   * Get the metadata cache instance
   */
  getMetadataCache(): TicketMetadataCache {
    return this.metadataCache;
  }

  /**
   * Ensure metadata cache is initialized (required before validation)
   */
  async ensureMetadataCacheInitialized(): Promise<void> {
    // Ensure client is initialized first (which initializes the cache)
    await this.ensureClient();
  }

  /**
   * Resolve pagination options with safe defaults
   *
   * @param options - Query options with optional pageSize
   * @param defaultPageSize - Default page size to use (entity-specific)
   * @returns Resolved pagination configuration
   *
   * Behavior:
   * - undefined or 0 → use defaultPageSize (safe default)
   * - positive number → use value (capped at 500)
   * - -1 → unlimited results (explicit opt-in)
   *
   * @example
   * resolvePaginationOptions({}, 50) // → { pageSize: 50, unlimited: false }
   * resolvePaginationOptions({ pageSize: 100 }, 50) // → { pageSize: 100, unlimited: false }
   * resolvePaginationOptions({ pageSize: -1 }, 50) // → { pageSize: null, unlimited: true }
   */
  private resolvePaginationOptions(
    options: AutotaskQueryOptions,
    defaultPageSize: number,
  ): { pageSize: number | null; unlimited: boolean } {
    const requestedPageSize = options.pageSize;

    // Case 1: Unlimited results explicitly requested (-1)
    if (requestedPageSize === -1) {
      this.logger.warn(
        'Fetching unlimited results may cause performance issues. Consider using filters or explicit pageSize limit.',
      );
      return { pageSize: null, unlimited: true };
    }

    // Case 2: Explicit positive value provided
    if (requestedPageSize !== undefined && requestedPageSize > 0) {
      const cappedPageSize = Math.min(requestedPageSize, 500);
      if (requestedPageSize > 500) {
        this.logger.warn(`Requested pageSize ${requestedPageSize} exceeds maximum 500, capping at 500`);
      }
      return { pageSize: cappedPageSize, unlimited: false };
    }

    // Case 3: Undefined or 0 → apply safe default
    this.logger.debug(
      `Applying default pageSize: ${defaultPageSize} (specify pageSize explicitly or use -1 for unlimited)`,
    );
    return { pageSize: defaultPageSize, unlimited: false };
  }

  // Company operations (using accounts in autotask-node)
  async getCompany(id: number): Promise<AutotaskCompany | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting company with ID: ${id}`);
      const result = await client.accounts.get(id);
      return (result.data as AutotaskCompany) || null;
    } catch (error) {
      this.logger.error(`Failed to get company ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for companies with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of companies
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 50 companies (safe default)
   * - pageSize: N (1-500): Returns up to N companies
   * - pageSize: -1: Returns ALL companies (use with caution)
   */
  async searchCompanies(options: AutotaskQueryOptions = {}): Promise<AutotaskCompany[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching companies with options:', options);

      // Resolve pagination with safe defaults
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 50);

      if (unlimited) {
        // Unlimited mode: fetch ALL companies via pagination
        const allCompanies: AutotaskCompany[] = [];
        const batchSize = 500; // Use max safe page size for efficiency
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          const queryOptions = {
            ...options,
            pageSize: batchSize,
            page: currentPage,
          };

          this.logger.debug(`Fetching companies page ${currentPage}...`);

          const result = await client.accounts.list(queryOptions as any);
          const companies = (result.data as AutotaskCompany[]) || [];

          if (companies.length === 0) {
            hasMorePages = false;
          } else {
            allCompanies.push(...companies);

            // Check if we got a full page - if not, we're done
            if (companies.length < batchSize) {
              hasMorePages = false;
            } else {
              currentPage++;
            }
          }

          // Safety check to prevent infinite loops
          if (currentPage > 50) {
            this.logger.warn('Company pagination safety limit reached at 50 pages (25,000 companies)');
            hasMorePages = false;
          }
        }

        this.logger.info(`Retrieved ${allCompanies.length} companies across ${currentPage} pages (unlimited mode)`);
        return allCompanies;
      } else {
        // Limited mode: fetch single page with specified/default pageSize
        const queryOptions = {
          ...options,
          pageSize: pageSize!,
        };

        this.logger.debug('Single page request with limit:', queryOptions);

        const result = await client.accounts.list(queryOptions as any);
        const companies = (result.data as AutotaskCompany[]) || [];

        this.logger.info(`Retrieved ${companies.length} companies (pageSize: ${pageSize})`);
        return companies;
      }
    } catch (error) {
      this.logger.error('Failed to search companies:', error);
      throw error;
    }
  }

  async createCompany(company: Partial<AutotaskCompany>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Creating company:', company);
      const result = await client.accounts.create(company as any);
      const companyId = (result.data as any)?.id;
      this.logger.info(`Company created with ID: ${companyId}`);
      return companyId;
    } catch (error) {
      this.logger.error('Failed to create company:', error);
      throw error;
    }
  }

  async updateCompany(id: number, updates: Partial<AutotaskCompany>): Promise<void> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Updating company ${id}:`, updates);
      await client.accounts.update(id, updates as any);
      this.logger.info(`Company ${id} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update company ${id}:`, error);
      throw error;
    }
  }

  // Contact operations
  async getContact(id: number): Promise<AutotaskContact | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting contact with ID: ${id}`);
      const result = await client.contacts.get(id);
      return (result.data as AutotaskContact) || null;
    } catch (error) {
      this.logger.error(`Failed to get contact ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for contacts with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of contacts
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 50 contacts (safe default)
   * - pageSize: N (1-500): Returns up to N contacts
   * - pageSize: -1: Returns ALL contacts (use with caution)
   */
  async searchContacts(options: AutotaskQueryOptions = {}): Promise<AutotaskContact[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching contacts with options:', options);

      // Resolve pagination with safe defaults
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 50);

      if (unlimited) {
        // Unlimited mode: fetch ALL contacts via pagination
        const allContacts: AutotaskContact[] = [];
        const batchSize = 500;
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          const queryOptions = {
            ...options,
            pageSize: batchSize,
            page: currentPage,
          };

          this.logger.debug(`Fetching contacts page ${currentPage}...`);

          const result = await client.contacts.list(queryOptions as any);
          const contacts = (result.data as AutotaskContact[]) || [];

          if (contacts.length === 0) {
            hasMorePages = false;
          } else {
            allContacts.push(...contacts);

            if (contacts.length < batchSize) {
              hasMorePages = false;
            } else {
              currentPage++;
            }
          }

          // Safety check to prevent infinite loops
          if (currentPage > 30) {
            this.logger.warn('Contact pagination safety limit reached at 30 pages (15,000 contacts)');
            hasMorePages = false;
          }
        }

        this.logger.info(`Retrieved ${allContacts.length} contacts across ${currentPage} pages (unlimited mode)`);
        return allContacts;
      } else {
        // Limited mode: fetch single page
        const queryOptions = {
          ...options,
          pageSize: pageSize!,
        };

        const result = await client.contacts.list(queryOptions as any);
        const contacts = (result.data as AutotaskContact[]) || [];

        this.logger.info(`Retrieved ${contacts.length} contacts (pageSize: ${pageSize})`);
        return contacts;
      }
    } catch (error) {
      this.logger.error('Failed to search contacts:', error);
      throw error;
    }
  }

  async createContact(contact: Partial<AutotaskContact>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Creating contact:', contact);
      const result = await client.contacts.create(contact as any);
      const contactId = (result.data as any)?.id;
      this.logger.info(`Contact created with ID: ${contactId}`);
      return contactId;
    } catch (error) {
      this.logger.error('Failed to create contact:', error);
      throw error;
    }
  }

  async updateContact(id: number, updates: Partial<AutotaskContact>): Promise<void> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Updating contact ${id}:`, updates);
      await client.contacts.update(id, updates as any);
      this.logger.info(`Contact ${id} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update contact ${id}:`, error);
      throw error;
    }
  }

  // Ticket operations
  async getTicket(id: number, fullDetails: boolean = false): Promise<AutotaskTicket | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting ticket with ID: ${id}, fullDetails: ${fullDetails}`);

      const result = await client.tickets.get(id);
      const ticket = result.data as AutotaskTicket;

      if (!ticket) {
        return null;
      }

      // Apply optimization unless full details requested
      return fullDetails ? ticket : this.optimizeTicketData(ticket);
    } catch (error) {
      this.logger.error(`Failed to get ticket ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for tickets with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of optimized tickets
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 50 tickets (safe default)
   * - pageSize: N (1-500): Returns up to N tickets
   * - pageSize: -1: Returns ALL tickets (use with caution)
   *
   * Note: All tickets are aggressively optimized to reduce response size.
   * Use get_ticket_details for full ticket data.
   */
  async searchTickets(options: AutotaskQueryOptionsExtended = {}): Promise<AutotaskTicket[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching tickets with options:', options);

      // Build proper filter array for Autotask API
      const filters: any[] = [];

      // Handle searchTerm - search in ticket number and title
      if (options.searchTerm) {
        filters.push({
          op: 'beginsWith',
          field: 'ticketNumber',
          value: options.searchTerm,
        });
      }

      // Handle status filter with more accurate open ticket definition
      if (options.status !== undefined) {
        filters.push({
          op: 'eq',
          field: 'status',
          value: options.status,
        });
      } else {
        // For "open" tickets, we need to be more specific about Autotask status values
        // Based on Autotask documentation, typical open statuses are:
        // 1 = New, 2 = In Progress, 8 = Waiting Customer, 9 = Waiting Vendor, etc.
        // Status 5 = Complete/Closed, so anything NOT complete should be considered open
        filters.push({
          op: 'ne',
          field: 'status',
          value: 5, // 5 = Complete in Autotask
        });
      }

      // Handle assignedResourceID filter or unassigned filter
      if (options.unassigned === true) {
        // Search for tickets with no assigned resource (null assignedResourceID)
        filters.push({
          op: 'eq',
          field: 'assignedResourceID',
          value: null,
        });
      } else if (options.assignedResourceID !== undefined) {
        filters.push({
          op: 'eq',
          field: 'assignedResourceID',
          value: options.assignedResourceID,
        });
      }

      // Only add company filter if explicitly provided
      if (options.companyId !== undefined) {
        filters.push({
          op: 'eq',
          field: 'companyID',
          value: options.companyId,
        });
      }

      // Resolve pagination with safe defaults
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 50);

      if (unlimited) {
        // Unlimited mode: fetch ALL tickets via pagination
        const allTickets: AutotaskTicket[] = [];
        const batchSize = 500;
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          const queryOptions = {
            filter: filters,
            pageSize: batchSize,
            page: currentPage,
          };

          this.logger.debug(`Fetching tickets page ${currentPage} with filter:`, filters);

          const result = await client.tickets.list(queryOptions);
          const tickets = (result.data as AutotaskTicket[]) || [];

          if (tickets.length === 0) {
            hasMorePages = false;
          } else {
            // Transform tickets to optimize data size
            const optimizedTickets = tickets.map((ticket) => this.optimizeTicketDataAggressive(ticket));
            allTickets.push(...optimizedTickets);

            if (tickets.length < batchSize) {
              hasMorePages = false;
            } else {
              currentPage++;
            }
          }

          // Safety check to prevent infinite loops
          if (currentPage > 100) {
            this.logger.warn('Pagination safety limit reached at 100 pages (50,000 tickets)');
            hasMorePages = false;
          }
        }

        this.logger.info(`Retrieved ${allTickets.length} tickets across ${currentPage} pages (unlimited mode)`);
        return allTickets;
      } else {
        // Limited mode: fetch single page
        const queryOptions = {
          filter: filters,
          pageSize: pageSize!,
        };

        this.logger.debug('Single page ticket request:', queryOptions);

        const result = await client.tickets.list(queryOptions);
        const tickets = (result.data as AutotaskTicket[]) || [];

        const optimizedTickets = tickets.map((ticket) => this.optimizeTicketDataAggressive(ticket));

        this.logger.info(`Retrieved ${optimizedTickets.length} tickets (pageSize: ${pageSize})`);
        return optimizedTickets;
      }
    } catch (error) {
      this.logger.error('Failed to search tickets:', error);
      throw error;
    }
  }

  /**
   * Aggressively optimize ticket data by keeping only essential fields
   * Since the API returns all 76 fields (~2KB per ticket), we need to be very selective
   */
  private optimizeTicketDataAggressive(ticket: AutotaskTicket): AutotaskTicket {
    // Keep only the most essential fields to minimize response size
    const optimized: AutotaskTicket = {};

    if (ticket.id !== undefined) optimized.id = ticket.id;
    if (ticket.ticketNumber !== undefined) optimized.ticketNumber = ticket.ticketNumber;
    if (ticket.title !== undefined) optimized.title = ticket.title;

    // Handle description with truncation
    if (ticket.description !== undefined && ticket.description !== null) {
      optimized.description =
        ticket.description.length > 200
          ? ticket.description.substring(0, 200) + '... [truncated - use get_ticket_details for full text]'
          : ticket.description;
    }

    if (ticket.status !== undefined) optimized.status = ticket.status;
    if (ticket.priority !== undefined) optimized.priority = ticket.priority;
    if (ticket.companyID !== undefined) optimized.companyID = ticket.companyID;
    if (ticket.contactID !== undefined) optimized.contactID = ticket.contactID;
    if (ticket.assignedResourceID !== undefined) optimized.assignedResourceID = ticket.assignedResourceID;
    if (ticket.createDate !== undefined) optimized.createDate = ticket.createDate;
    if (ticket.lastActivityDate !== undefined) optimized.lastActivityDate = ticket.lastActivityDate;
    if (ticket.dueDateTime !== undefined) optimized.dueDateTime = ticket.dueDateTime;
    if (ticket.completedDate !== undefined) optimized.completedDate = ticket.completedDate;
    if (ticket.estimatedHours !== undefined) optimized.estimatedHours = ticket.estimatedHours;
    if (ticket.ticketType !== undefined) optimized.ticketType = ticket.ticketType;
    if (ticket.source !== undefined) optimized.source = ticket.source;
    if (ticket.issueType !== undefined) optimized.issueType = ticket.issueType;
    if (ticket.subIssueType !== undefined) optimized.subIssueType = ticket.subIssueType;

    // Handle resolution with truncation
    if (ticket.resolution !== undefined && ticket.resolution !== null) {
      optimized.resolution =
        ticket.resolution.length > 100
          ? ticket.resolution.substring(0, 100) + '... [truncated - use get_ticket_details for full text]'
          : ticket.resolution;
    }

    return optimized;
  }

  /**
   * Optimize ticket data by truncating large text fields and removing unnecessary data
   * This is the less aggressive version used by getTicket
   */
  private optimizeTicketData(ticket: AutotaskTicket): AutotaskTicket {
    const maxDescriptionLength = 500;
    const maxNotesLength = 300;

    return {
      ...ticket,
      // Truncate description if too long
      description:
        ticket.description && ticket.description.length > maxDescriptionLength
          ? ticket.description.substring(0, maxDescriptionLength) + '... [truncated]'
          : ticket.description,

      // Remove or truncate potentially large fields
      resolution:
        ticket.resolution && ticket.resolution.length > maxNotesLength
          ? ticket.resolution.substring(0, maxNotesLength) + '... [truncated]'
          : ticket.resolution,

      // Remove arrays that might contain large amounts of data
      userDefinedFields: [],

      // Keep only essential custom fields, truncate if present
      ...(ticket.purchaseOrderNumber && {
        purchaseOrderNumber:
          ticket.purchaseOrderNumber.length > 50
            ? ticket.purchaseOrderNumber.substring(0, 50) + '...'
            : ticket.purchaseOrderNumber,
      }),
    };
  }

  async createTicket(ticket: Partial<AutotaskTicket>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Creating ticket:', ticket);
      const result = await client.tickets.create(ticket as any);
      const ticketId = (result.data as any)?.id;
      this.logger.info(`Ticket created with ID: ${ticketId}`);
      return ticketId;
    } catch (error) {
      this.logger.error('Failed to create ticket:', error);
      throw error;
    }
  }

  /**
   * Update a ticket with validation via metadata cache
   */
  async updateTicket(id: number, updates: TicketUpdateFields): Promise<AutotaskTicket> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Updating ticket ${id}:`, updates);

      // Build PATCH payload with PascalCase field names for Autotask REST API
      const payload: any = {};

      if (updates.assignedResourceID !== undefined) {
        payload.AssignedResourceID = updates.assignedResourceID;
      }
      if (updates.status !== undefined) {
        payload.Status = updates.status;
      }
      if (updates.priority !== undefined) {
        payload.Priority = updates.priority;
      }
      if (updates.queueID !== undefined) {
        payload.QueueID = updates.queueID;
      }
      if (updates.title !== undefined) {
        payload.Title = updates.title;
      }
      if (updates.description !== undefined) {
        payload.Description = updates.description;
      }
      if (updates.resolution !== undefined) {
        payload.Resolution = updates.resolution;
      }
      if (updates.dueDateTime !== undefined) {
        payload.DueDateTime = updates.dueDateTime;
      }
      if (updates.lastActivityDate !== undefined) {
        payload.LastActivityDate = updates.lastActivityDate;
      }

      // Use the client's update method
      const result = await client.tickets.update(id, payload);

      this.logger.info(`Ticket ${id} updated successfully`);
      return result.data as AutotaskTicket;
    } catch (error) {
      // Map error to structured response with guidance
      const mappedError = ErrorMapper.mapAutotaskError(error, 'update_ticket');

      this.logger.error(`Failed to update ticket ${id}:`, {
        error: mappedError,
        ticketId: id,
        correlationId: mappedError.correlationId,
      });

      // Re-throw with mapped error structure
      const enhancedError = new Error(mappedError.message);
      (enhancedError as any).code = mappedError.code;
      (enhancedError as any).guidance = mappedError.guidance;
      (enhancedError as any).correlationId = mappedError.correlationId;
      throw enhancedError;
    }
  }

  // Time entry operations
  async createTimeEntry(timeEntry: Partial<AutotaskTimeEntry>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Creating time entry:', timeEntry);
      const result = await client.timeEntries.create(timeEntry as any);
      const timeEntryId = (result.data as any)?.id;
      this.logger.info(`Time entry created with ID: ${timeEntryId}`);
      return timeEntryId;
    } catch (error) {
      this.logger.error('Failed to create time entry:', error);
      throw error;
    }
  }

  async getTimeEntries(options: AutotaskQueryOptions = {}): Promise<AutotaskTimeEntry[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Getting time entries with options:', options);
      const result = await client.timeEntries.list(options as any);
      return (result.data as AutotaskTimeEntry[]) || [];
    } catch (error) {
      this.logger.error('Failed to get time entries:', error);
      throw error;
    }
  }

  // Project operations
  async getProject(id: number): Promise<AutotaskProject | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting project with ID: ${id}`);
      const result = await client.projects.get(id);
      return (result.data as unknown as AutotaskProject) || null;
    } catch (error) {
      this.logger.error(`Failed to get project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for projects with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of optimized projects
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 25 projects (safe default)
   * - pageSize: N (1-100): Returns up to N projects (capped at 100 for this endpoint)
   * - pageSize: -1: Returns up to 100 projects (API limit)
   *
   * Note: This method uses direct API calls due to autotask-node library limitations.
   */
  async searchProjects(options: AutotaskQueryOptions = {}): Promise<AutotaskProject[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching projects with options:', options);

      // Resolve pagination with safe defaults (capped at 100 for projects API)
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 25);
      const finalPageSize = Math.min(unlimited ? 100 : pageSize!, 100); // Projects API max is 100

      // WORKAROUND: The autotask-node library's projects.list() method is broken
      // It uses GET with query params instead of POST with body like the working companies endpoint
      // We'll bypass it and make the correct API call directly

      // Essential fields for optimized response size
      const essentialFields = [
        'id',
        'projectName',
        'projectNumber',
        'description',
        'status',
        'projectType',
        'department',
        'companyID',
        'projectManagerResourceID',
        'startDateTime',
        'endDateTime',
        'actualHours',
        'estimatedHours',
        'laborEstimatedRevenue',
        'createDate',
        'completedDate',
        'contractID',
        'originalEstimatedRevenue',
      ];

      // Prepare search body in the same format as working companies endpoint
      const searchBody: any = {};

      // Ensure there's a filter - Autotask API requires a filter
      if (
        !options.filter ||
        (Array.isArray(options.filter) && options.filter.length === 0) ||
        (!Array.isArray(options.filter) && Object.keys(options.filter).length === 0)
      ) {
        searchBody.filter = [
          {
            op: 'gte',
            field: 'id',
            value: 0,
          },
        ];
      } else {
        // If filter is provided as an object, convert to array format expected by API
        if (!Array.isArray(options.filter)) {
          const filterArray = [];
          for (const [field, value] of Object.entries(options.filter)) {
            filterArray.push({
              op: 'eq',
              field: field,
              value: value,
            });
          }
          searchBody.filter = filterArray;
        } else {
          searchBody.filter = options.filter;
        }
      }

      // Add other search parameters
      if (options.sort) searchBody.sort = options.sort;
      if (options.page) searchBody.page = options.page;

      // Apply resolved pageSize
      searchBody.pageSize = finalPageSize;

      // Add field limiting for optimization
      if (essentialFields.length > 0) {
        searchBody.includeFields = essentialFields;
      }

      this.logger.debug('Making direct API call to Projects/query with body:', searchBody);

      // Make the correct API call directly using the axios instance from the client
      const response = await (client as any).axios.post('/Projects/query', searchBody);

      // Extract projects from response (should be in response.data.items format)
      let projects: AutotaskProject[] = [];
      if (response.data && response.data.items) {
        projects = response.data.items;
      } else if (Array.isArray(response.data)) {
        projects = response.data;
      } else {
        this.logger.warn('Unexpected response format from Projects/query:', response.data);
        projects = [];
      }

      // Transform projects to optimize data size
      const optimizedProjects = projects.map((project) => this.optimizeProjectData(project));

      this.logger.info(`Retrieved ${optimizedProjects.length} projects (pageSize: ${finalPageSize})`);
      return optimizedProjects;
    } catch (error: any) {
      // Check if it's the same 405 error pattern
      if (error.response && error.response.status === 405) {
        this.logger.warn(
          'Projects endpoint may not support listing via API (405 Method Not Allowed). This is common with some Autotask configurations.',
        );
        return [];
      }
      this.logger.error('Failed to search projects:', error);
      throw error;
    }
  }

  /**
   * Optimize project data by truncating large text fields
   */
  private optimizeProjectData(project: AutotaskProject): AutotaskProject {
    const maxDescriptionLength = 500;

    const optimizedDescription = project.description
      ? project.description.length > maxDescriptionLength
        ? project.description.substring(0, maxDescriptionLength) + '... [truncated]'
        : project.description
      : '';

    return {
      ...project,
      description: optimizedDescription,
      // Remove potentially large arrays
      userDefinedFields: [],
    };
  }

  async createProject(project: Partial<AutotaskProject>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Creating project:', project);
      const result = await client.projects.create(project as any);
      const projectId = (result.data as any)?.id;
      this.logger.info(`Project created with ID: ${projectId}`);
      return projectId;
    } catch (error) {
      this.logger.error('Failed to create project:', error);
      throw error;
    }
  }

  async updateProject(id: number, updates: Partial<AutotaskProject>): Promise<void> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Updating project ${id}:`, updates);
      await client.projects.update(id, updates as any);
      this.logger.info(`Project ${id} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update project ${id}:`, error);
      throw error;
    }
  }

  // Resource operations
  async getResource(id: number): Promise<AutotaskResource | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting resource with ID: ${id}`);
      const result = await client.resources.get(id);
      return (result.data as AutotaskResource) || null;
    } catch (error) {
      this.logger.error(`Failed to get resource ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for resources with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of resources
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 25 resources (safe default for larger records)
   * - pageSize: N (1-500): Returns up to N resources
   * - pageSize: -1: Returns ALL resources (use with caution)
   */
  async searchResources(options: AutotaskQueryOptions = {}): Promise<AutotaskResource[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching resources with options:', options);

      // Resolve pagination with safe defaults (25 for larger records)
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 25);

      if (unlimited) {
        // Unlimited mode: fetch ALL resources via pagination
        const allResources: AutotaskResource[] = [];
        const batchSize = 500;
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          const queryOptions = {
            ...options,
            pageSize: batchSize,
            page: currentPage,
          };

          this.logger.debug(`Fetching resources page ${currentPage}...`);

          const result = await client.resources.list(queryOptions as any);
          const resources = (result.data as AutotaskResource[]) || [];

          if (resources.length === 0) {
            hasMorePages = false;
          } else {
            allResources.push(...resources);

            if (resources.length < batchSize) {
              hasMorePages = false;
            } else {
              currentPage++;
            }
          }

          // Safety check to prevent infinite loops
          if (currentPage > 20) {
            this.logger.warn('Resource pagination safety limit reached at 20 pages (10,000 resources)');
            hasMorePages = false;
          }
        }

        this.logger.info(`Retrieved ${allResources.length} resources across ${currentPage} pages (unlimited mode)`);
        return allResources;
      } else {
        // Limited mode: fetch single page
        const queryOptions = {
          ...options,
          pageSize: pageSize!,
        };

        const result = await client.resources.list(queryOptions as any);
        const resources = (result.data as AutotaskResource[]) || [];

        this.logger.info(`Retrieved ${resources.length} resources (pageSize: ${pageSize})`);
        return resources;
      }
    } catch (error) {
      this.logger.error('Failed to search resources:', error);
      throw error;
    }
  }

  // Opportunity operations (Note: opportunities endpoint may not be available in autotask-node)
  // async getOpportunity(id: number): Promise<AutotaskOpportunity | null> {
  //   const client = await this.ensureClient();
  //
  //   try {
  //     this.logger.debug(`Getting opportunity with ID: ${id}`);
  //     const result = await client.opportunities.get(id);
  //     return result.data as AutotaskOpportunity || null;
  //   } catch (error) {
  //     this.logger.error(`Failed to get opportunity ${id}:`, error);
  //     throw error;
  //   }
  // }

  // async searchOpportunities(options: AutotaskQueryOptions = {}): Promise<AutotaskOpportunity[]> {
  //   const client = await this.ensureClient();
  //
  //   try {
  //     this.logger.debug('Searching opportunities with options:', options);
  //     const result = await client.opportunities.list(options as any);
  //     return (result.data as AutotaskOpportunity[]) || [];
  //   } catch (error) {
  //     this.logger.error('Failed to search opportunities:', error);
  //     throw error;
  //   }
  // }

  // async createOpportunity(opportunity: Partial<AutotaskOpportunity>): Promise<number> {
  //   const client = await this.ensureClient();
  //
  //   try {
  //     this.logger.debug('Creating opportunity:', opportunity);
  //     const result = await client.opportunities.create(opportunity as any);
  //     const opportunityId = (result.data as any)?.id;
  //     this.logger.info(`Opportunity created with ID: ${opportunityId}`);
  //     return opportunityId;
  //   } catch (error) {
  //     this.logger.error('Failed to create opportunity:', error);
  //     throw error;
  //   }
  // }

  // async updateOpportunity(id: number, updates: Partial<AutotaskOpportunity>): Promise<void> {
  //   const client = await this.ensureClient();
  //
  //   try {
  //     this.logger.debug(`Updating opportunity ${id}:`, updates);
  //     await client.opportunities.update(id, updates as any);
  //     this.logger.info(`Opportunity ${id} updated successfully`);
  //   } catch (error) {
  //     this.logger.error(`Failed to update opportunity ${id}:`, error);
  //     throw error;
  //   }
  // }

  // Configuration Item operations
  async getConfigurationItem(id: number): Promise<AutotaskConfigurationItem | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting configuration item with ID: ${id}`);
      const result = await client.configurationItems.get(id);
      return (result.data as AutotaskConfigurationItem) || null;
    } catch (error) {
      this.logger.error(`Failed to get configuration item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for configuration items with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of configuration items
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 25 configuration items (safe default)
   * - pageSize: N (1-500): Returns up to N items
   * - pageSize: -1: Returns ALL items (use with caution)
   */
  async searchConfigurationItems(options: AutotaskQueryOptions = {}): Promise<AutotaskConfigurationItem[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching configuration items with options:', options);

      // Resolve pagination with safe defaults
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 25);

      const queryOptions = {
        ...options,
        pageSize: unlimited ? 500 : pageSize!,
      };

      const result = await client.configurationItems.list(queryOptions as any);
      const items = (result.data as AutotaskConfigurationItem[]) || [];

      this.logger.info(`Retrieved ${items.length} configuration items (pageSize: ${pageSize || 'unlimited'})`);
      return items;
    } catch (error) {
      this.logger.error('Failed to search configuration items:', error);
      throw error;
    }
  }

  async createConfigurationItem(configItem: Partial<AutotaskConfigurationItem>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Creating configuration item:', configItem);
      const result = await client.configurationItems.create(configItem as any);
      const configItemId = (result.data as any)?.id;
      this.logger.info(`Configuration item created with ID: ${configItemId}`);
      return configItemId;
    } catch (error) {
      this.logger.error('Failed to create configuration item:', error);
      throw error;
    }
  }

  async updateConfigurationItem(id: number, updates: Partial<AutotaskConfigurationItem>): Promise<void> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Updating configuration item ${id}:`, updates);
      await client.configurationItems.update(id, updates as any);
      this.logger.info(`Configuration item ${id} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update configuration item ${id}:`, error);
      throw error;
    }
  }

  // Product operations (Note: products endpoint may not be available in autotask-node)
  // async getProduct(id: number): Promise<AutotaskProduct | null> {
  //   const client = await this.ensureClient();
  //
  //   try {
  //     this.logger.debug(`Getting product with ID: ${id}`);
  //     const result = await client.products.get(id);
  //     return result.data as AutotaskProduct || null;
  //   } catch (error) {
  //     this.logger.error(`Failed to get product ${id}:`, error);
  //     throw error;
  //   }
  // }

  // async searchProducts(options: AutotaskQueryOptions = {}): Promise<AutotaskProduct[]> {
  //   const client = await this.ensureClient();
  //
  //   try {
  //     this.logger.debug('Searching products with options:', options);
  //     const result = await client.products.list(options as any);
  //     return (result.data as AutotaskProduct[]) || [];
  //   } catch (error) {
  //     this.logger.error('Failed to search products:', error);
  //     throw error;
  //   }
  // }

  // Contract operations (read-only for now as they're complex)
  async getContract(id: number): Promise<AutotaskContract | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting contract with ID: ${id}`);
      const result = await client.contracts.get(id);
      return (result.data as unknown as AutotaskContract) || null;
    } catch (error) {
      this.logger.error(`Failed to get contract ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for contracts with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of contracts
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 25 contracts (safe default)
   * - pageSize: N (1-500): Returns up to N contracts
   * - pageSize: -1: Returns ALL contracts (use with caution)
   */
  async searchContracts(options: AutotaskQueryOptions = {}): Promise<AutotaskContract[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching contracts with options:', options);

      // Resolve pagination with safe defaults
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 25);

      const queryOptions = {
        ...options,
        pageSize: unlimited ? 500 : pageSize!,
      };

      const result = await client.contracts.list(queryOptions as any);
      const contracts = (result.data as unknown as AutotaskContract[]) || [];

      this.logger.info(`Retrieved ${contracts.length} contracts (pageSize: ${pageSize || 'unlimited'})`);
      return contracts;
    } catch (error) {
      this.logger.error('Failed to search contracts:', error);
      throw error;
    }
  }

  // Invoice operations (read-only)
  async getInvoice(id: number): Promise<AutotaskInvoice | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting invoice with ID: ${id}`);
      const result = await client.invoices.get(id);
      return (result.data as AutotaskInvoice) || null;
    } catch (error) {
      this.logger.error(`Failed to get invoice ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for invoices with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of invoices
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 25 invoices (safe default)
   * - pageSize: N (1-500): Returns up to N invoices
   * - pageSize: -1: Returns ALL invoices (use with caution)
   */
  async searchInvoices(options: AutotaskQueryOptions = {}): Promise<AutotaskInvoice[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching invoices with options:', options);

      // Resolve pagination with safe defaults
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 25);

      const queryOptions = {
        ...options,
        pageSize: unlimited ? 500 : pageSize!,
      };

      const result = await client.invoices.list(queryOptions as any);
      const invoices = (result.data as AutotaskInvoice[]) || [];

      this.logger.info(`Retrieved ${invoices.length} invoices (pageSize: ${pageSize || 'unlimited'})`);
      return invoices;
    } catch (error) {
      this.logger.error('Failed to search invoices:', error);
      throw error;
    }
  }

  // Task operations
  async getTask(id: number): Promise<AutotaskTask | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting task with ID: ${id}`);
      const result = await client.tasks.get(id);
      return (result.data as unknown as AutotaskTask) || null;
    } catch (error) {
      this.logger.error(`Failed to get task ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for tasks with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of optimized tasks
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 25 tasks (safe default)
   * - pageSize: N (1-100): Returns up to N tasks (capped at 100)
   * - pageSize: -1: Returns up to 100 tasks (API limit)
   *
   * Note: Tasks are optimized with field limiting for reduced response size.
   */
  async searchTasks(options: AutotaskQueryOptions = {}): Promise<AutotaskTask[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching tasks with options:', options);

      // Resolve pagination with safe defaults
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 25);
      const finalPageSize = Math.min(unlimited ? 100 : pageSize!, 100); // Tasks API max is 100

      // Define essential task fields to minimize response size
      const essentialFields = [
        'id',
        'title',
        'description',
        'status',
        'projectID',
        'assignedResourceID',
        'creatorResourceID',
        'createDateTime',
        'startDateTime',
        'endDateTime',
        'estimatedHours',
        'hoursToBeScheduled',
        'remainingHours',
        'percentComplete',
        'priorityLabel',
        'taskType',
        'lastActivityDateTime',
        'completedDateTime',
      ];

      // Set default pagination and field limits
      const optimizedOptions = {
        ...options,
        includeFields: essentialFields,
        pageSize: finalPageSize,
      };

      const result = await client.tasks.list(optimizedOptions as any);
      const tasks = (result.data as unknown as AutotaskTask[]) || [];

      // Transform tasks to optimize data size
      const optimizedTasks = tasks.map((task) => this.optimizeTaskData(task));

      this.logger.info(`Retrieved ${optimizedTasks.length} tasks (pageSize: ${finalPageSize})`);
      return optimizedTasks;
    } catch (error) {
      this.logger.error('Failed to search tasks:', error);
      throw error;
    }
  }

  /**
   * Optimize task data by truncating large text fields
   */
  private optimizeTaskData(task: AutotaskTask): AutotaskTask {
    const maxDescriptionLength = 400;

    const optimizedDescription = task.description
      ? task.description.length > maxDescriptionLength
        ? task.description.substring(0, maxDescriptionLength) + '... [truncated]'
        : task.description
      : '';

    return {
      ...task,
      description: optimizedDescription,
      // Remove potentially large arrays
      userDefinedFields: [],
    };
  }

  async createTask(task: Partial<AutotaskTask>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Creating task:', task);
      const result = await client.tasks.create(task as any);
      const taskId = (result.data as any)?.id;
      this.logger.info(`Task created with ID: ${taskId}`);
      return taskId;
    } catch (error) {
      this.logger.error('Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(id: number, updates: Partial<AutotaskTask>): Promise<void> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Updating task ${id}:`, updates);
      await client.tasks.update(id, updates as any);
      this.logger.info(`Task ${id} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update task ${id}:`, error);
      throw error;
    }
  }

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      // Try to list companies with limit of 1 as a connection test
      await client.accounts.list({ pageSize: 1 } as any);
      this.logger.info('Connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  // =====================================================
  // NEW ENTITY METHODS - Phase 1: High-Priority Entities
  // =====================================================

  // Note entities - Using the generic notes endpoint
  async getTicketNote(ticketId: number, noteId: number): Promise<AutotaskTicketNote | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting ticket note - TicketID: ${ticketId}, NoteID: ${noteId}`);
      // Use generic notes endpoint with filtering
      const result = await client.notes.list({
        filter: [
          { field: 'ticketId', op: 'eq', value: ticketId },
          { field: 'id', op: 'eq', value: noteId },
        ],
      });
      const notes = (result.data as any[]) || [];
      return notes.length > 0 ? (notes[0] as AutotaskTicketNote) : null;
    } catch (error) {
      this.logger.error(`Failed to get ticket note ${noteId} for ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async searchTicketNotes(ticketId: number, options: AutotaskQueryOptionsExtended = {}): Promise<AutotaskTicketNote[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Searching ticket notes for ticket ${ticketId}:`, options);

      // Set reasonable limits for notes
      const optimizedOptions = {
        filter: [{ field: 'ticketId', op: 'eq', value: ticketId }],
        pageSize: options.pageSize || 25,
      };

      const result = await client.notes.list(optimizedOptions);
      const notes = (result.data as any[]) || [];

      this.logger.info(`Retrieved ${notes.length} ticket notes`);
      return notes as AutotaskTicketNote[];
    } catch (error) {
      this.logger.error(`Failed to search ticket notes for ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async createTicketNote(note: Partial<AutotaskTicketNote>): Promise<AutotaskTicketNote> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Creating ticket note:`, note);

      // Note: Validation should happen in the tool handler before calling this method
      // This service method enforces publish level and length checks at the API level

      // Enforce publish level check (must be 1 or 3)
      if (note.publish !== undefined && note.publish !== 1 && note.publish !== 3) {
        const error = new Error(`Invalid publish level: ${note.publish}. Must be 1 (Internal) or 3 (External)`);
        this.logger.error('Ticket note creation failed - invalid publish level:', error);
        throw error;
      }

      // Enforce description length check (max 32000 chars)
      if (note.description && note.description.length > 32000) {
        const error = new Error(
          `Note description exceeds maximum length of 32000 characters. ` +
            `Current length: ${note.description.length}`,
        );
        this.logger.error('Ticket note creation failed - description too long:', error);
        throw error;
      }

      // Build PascalCase payload for Autotask REST API
      // Note: Validation is performed by TicketUpdateValidator in the handler layer
      const payload: any = {
        TicketID: note.ticketID,
        Description: note.description?.trim() || '',
        Publish: note.publish,
      };

      if (note.title && note.title.trim().length > 0) {
        payload.Title = note.title.trim();
      }

      const result = await client.notes.create(payload);
      const createdNote = result.data as AutotaskTicketNote;

      this.logger.info(`Ticket note created with ID: ${createdNote.id}`);
      return createdNote;
    } catch (error) {
      // Map error to structured response with guidance
      const mappedError = ErrorMapper.mapAutotaskError(error, 'create_ticket_note');

      this.logger.error(`Failed to create ticket note:`, {
        error: mappedError,
        ticketId: note.ticketID,
        correlationId: mappedError.correlationId,
      });

      // Re-throw with mapped error structure
      const enhancedError = new Error(mappedError.message);
      (enhancedError as any).code = mappedError.code;
      (enhancedError as any).guidance = mappedError.guidance;
      (enhancedError as any).correlationId = mappedError.correlationId;
      throw enhancedError;
    }
  }

  async getProjectNote(projectId: number, noteId: number): Promise<AutotaskProjectNote | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting project note - ProjectID: ${projectId}, NoteID: ${noteId}`);
      const result = await client.notes.list({
        filter: [
          { field: 'projectId', op: 'eq', value: projectId },
          { field: 'id', op: 'eq', value: noteId },
        ],
      });
      const notes = (result.data as any[]) || [];
      return notes.length > 0 ? (notes[0] as AutotaskProjectNote) : null;
    } catch (error) {
      this.logger.error(`Failed to get project note ${noteId} for project ${projectId}:`, error);
      throw error;
    }
  }

  async searchProjectNotes(
    projectId: number,
    options: AutotaskQueryOptionsExtended = {},
  ): Promise<AutotaskProjectNote[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Searching project notes for project ${projectId}:`, options);

      const optimizedOptions = {
        filter: [{ field: 'projectId', op: 'eq', value: projectId }],
        pageSize: options.pageSize || 25,
      };

      const result = await client.notes.list(optimizedOptions);
      const notes = (result.data as any[]) || [];

      this.logger.info(`Retrieved ${notes.length} project notes`);
      return notes as AutotaskProjectNote[];
    } catch (error) {
      this.logger.error(`Failed to search project notes for project ${projectId}:`, error);
      throw error;
    }
  }

  async createProjectNote(projectId: number, note: Partial<AutotaskProjectNote>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Creating project note for project ${projectId}:`, note);
      const noteData = {
        ...note,
        projectId: projectId,
      };
      const result = await client.notes.create(noteData as any);
      const noteId = (result.data as any)?.id;
      this.logger.info(`Project note created with ID: ${noteId}`);
      return noteId;
    } catch (error) {
      this.logger.error(`Failed to create project note for project ${projectId}:`, error);
      throw error;
    }
  }

  async getCompanyNote(companyId: number, noteId: number): Promise<AutotaskCompanyNote | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting company note - CompanyID: ${companyId}, NoteID: ${noteId}`);
      const result = await client.notes.list({
        filter: [
          { field: 'accountId', op: 'eq', value: companyId },
          { field: 'id', op: 'eq', value: noteId },
        ],
      });
      const notes = (result.data as any[]) || [];
      return notes.length > 0 ? (notes[0] as AutotaskCompanyNote) : null;
    } catch (error) {
      this.logger.error(`Failed to get company note ${noteId} for company ${companyId}:`, error);
      throw error;
    }
  }

  async searchCompanyNotes(
    companyId: number,
    options: AutotaskQueryOptionsExtended = {},
  ): Promise<AutotaskCompanyNote[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Searching company notes for company ${companyId}:`, options);

      const optimizedOptions = {
        filter: [{ field: 'accountId', op: 'eq', value: companyId }],
        pageSize: options.pageSize || 25,
      };

      const result = await client.notes.list(optimizedOptions);
      const notes = (result.data as any[]) || [];

      this.logger.info(`Retrieved ${notes.length} company notes`);
      return notes as AutotaskCompanyNote[];
    } catch (error) {
      this.logger.error(`Failed to search company notes for company ${companyId}:`, error);
      throw error;
    }
  }

  async createCompanyNote(companyId: number, note: Partial<AutotaskCompanyNote>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Creating company note for company ${companyId}:`, note);
      const noteData = {
        ...note,
        accountId: companyId,
      };
      const result = await client.notes.create(noteData as any);
      const noteId = (result.data as any)?.id;
      this.logger.info(`Company note created with ID: ${noteId}`);
      return noteId;
    } catch (error) {
      this.logger.error(`Failed to create company note for company ${companyId}:`, error);
      throw error;
    }
  }

  // Attachment entities - Using the generic attachments endpoint
  async getTicketAttachment(
    ticketId: number,
    attachmentId: number,
    includeData: boolean = false,
  ): Promise<AutotaskTicketAttachment | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(
        `Getting ticket attachment - TicketID: ${ticketId}, AttachmentID: ${attachmentId}, includeData: ${includeData}`,
      );

      // Search for attachment by parent ID and attachment ID
      const result = await client.attachments.list({
        filter: [
          { field: 'parentId', op: 'eq', value: ticketId },
          { field: 'id', op: 'eq', value: attachmentId },
        ],
      });

      const attachments = (result.data as any[]) || [];
      return attachments.length > 0 ? (attachments[0] as AutotaskTicketAttachment) : null;
    } catch (error) {
      this.logger.error(`Failed to get ticket attachment ${attachmentId} for ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async searchTicketAttachments(
    ticketId: number,
    options: AutotaskQueryOptionsExtended = {},
  ): Promise<AutotaskTicketAttachment[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Searching ticket attachments for ticket ${ticketId}:`, options);

      const optimizedOptions = {
        filter: [{ field: 'parentId', op: 'eq', value: ticketId }],
        pageSize: options.pageSize || 10,
      };

      const result = await client.attachments.list(optimizedOptions);
      const attachments = (result.data as any[]) || [];

      this.logger.info(`Retrieved ${attachments.length} ticket attachments`);
      return attachments as AutotaskTicketAttachment[];
    } catch (error) {
      this.logger.error(`Failed to search ticket attachments for ticket ${ticketId}:`, error);
      throw error;
    }
  }

  // Expense entities
  async getExpenseReport(id: number): Promise<AutotaskExpenseReport | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting expense report with ID: ${id}`);
      const result = await client.expenses.get(id);
      return (result.data as unknown as AutotaskExpenseReport) || null;
    } catch (error) {
      this.logger.error(`Failed to get expense report ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for expense reports with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of expense reports
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 25 expense reports (safe default)
   * - pageSize: N (1-500): Returns up to N reports
   * - pageSize: -1: Returns up to 500 reports
   */
  async searchExpenseReports(options: AutotaskQueryOptionsExtended = {}): Promise<AutotaskExpenseReport[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching expense reports with options:', options);

      // Resolve pagination with safe defaults
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 25);

      // Build filter based on provided options
      const filters = [];
      if (options.submitterId) {
        filters.push({
          field: 'resourceId',
          op: 'eq',
          value: options.submitterId,
        });
      }
      if (options.status) {
        filters.push({ field: 'status', op: 'eq', value: options.status });
      }

      const queryOptions = {
        filter: filters.length > 0 ? filters : [{ field: 'id', op: 'gte', value: 0 }],
        pageSize: unlimited ? 500 : pageSize!,
      };

      const result = await client.expenses.list(queryOptions);
      const reports = (result.data as any[]) || [];

      this.logger.info(`Retrieved ${reports.length} expense reports (pageSize: ${pageSize || 'unlimited'})`);
      return reports as AutotaskExpenseReport[];
    } catch (error) {
      this.logger.error('Failed to search expense reports:', error);
      throw error;
    }
  }

  async createExpenseReport(report: Partial<AutotaskExpenseReport>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Creating expense report:', report);
      const result = await client.expenses.create(report as any);
      const reportId = (result.data as any)?.id;
      this.logger.info(`Expense report created with ID: ${reportId}`);
      return reportId;
    } catch (error) {
      this.logger.error('Failed to create expense report:', error);
      throw error;
    }
  }

  // For expense items, we'll need to use a different approach since they're child entities
  // This is a placeholder - actual implementation may vary based on API structure
  async getExpenseItem(_expenseId: number, _itemId: number): Promise<AutotaskExpenseItem | null> {
    // This would need to be implemented based on the actual API structure for child items
    throw new Error('Expense items API not yet implemented - requires child entity handling');
  }

  async searchExpenseItems(
    _expenseId: number,
    _options: AutotaskQueryOptionsExtended = {},
  ): Promise<AutotaskExpenseItem[]> {
    // This would need to be implemented based on the actual API structure for child items
    throw new Error('Expense items API not yet implemented - requires child entity handling');
  }

  async createExpenseItem(_expenseId: number, _item: Partial<AutotaskExpenseItem>): Promise<number> {
    // This would need to be implemented based on the actual API structure for child items
    throw new Error('Expense items API not yet implemented - requires child entity handling');
  }

  // Quote entity
  async getQuote(id: number): Promise<AutotaskQuote | null> {
    const client = await this.ensureClient();

    try {
      this.logger.debug(`Getting quote with ID: ${id}`);
      const result = await client.quotes.get(id);
      return (result.data as AutotaskQuote) || null;
    } catch (error) {
      this.logger.error(`Failed to get quote ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for quotes with safe pagination defaults
   *
   * @param options - Search options with optional pageSize
   * @returns Array of quotes
   *
   * Pagination behavior (v2.0.0+):
   * - No pageSize specified: Returns 25 quotes (safe default)
   * - pageSize: N (1-500): Returns up to N quotes
   * - pageSize: -1: Returns up to 500 quotes
   */
  async searchQuotes(options: AutotaskQueryOptionsExtended = {}): Promise<AutotaskQuote[]> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Searching quotes with options:', options);

      // Resolve pagination with safe defaults
      const { pageSize, unlimited } = this.resolvePaginationOptions(options, 25);

      // Build filter based on provided options
      const filters = [];
      if (options.companyId) {
        filters.push({
          field: 'accountId',
          op: 'eq',
          value: options.companyId,
        });
      }
      if (options.contactId) {
        filters.push({
          field: 'contactId',
          op: 'eq',
          value: options.contactId,
        });
      }
      if (options.opportunityId) {
        filters.push({
          field: 'opportunityId',
          op: 'eq',
          value: options.opportunityId,
        });
      }
      if (options.searchTerm) {
        filters.push({
          field: 'description',
          op: 'contains',
          value: options.searchTerm,
        });
      }

      const queryOptions = {
        filter: filters.length > 0 ? filters : [{ field: 'id', op: 'gte', value: 0 }],
        pageSize: unlimited ? 500 : pageSize!,
      };

      const result = await client.quotes.list(queryOptions);
      const quotes = (result.data as any[]) || [];

      this.logger.info(`Retrieved ${quotes.length} quotes (pageSize: ${pageSize || 'unlimited'})`);
      return quotes as AutotaskQuote[];
    } catch (error) {
      this.logger.error('Failed to search quotes:', error);
      throw error;
    }
  }

  async createQuote(quote: Partial<AutotaskQuote>): Promise<number> {
    const client = await this.ensureClient();

    try {
      this.logger.debug('Creating quote:', quote);
      const result = await client.quotes.create(quote as any);
      const quoteId = (result.data as any)?.id;
      this.logger.info(`Quote created with ID: ${quoteId}`);
      return quoteId;
    } catch (error) {
      this.logger.error('Failed to create quote:', error);
      throw error;
    }
  }

  // BillingCode and Department entities are not directly available in autotask-node
  // These would need to be implemented via custom API calls or alternative endpoints
  async getBillingCode(_id: number): Promise<AutotaskBillingCode | null> {
    throw new Error('Billing codes API not directly available in autotask-node library');
  }

  async searchBillingCodes(_options: AutotaskQueryOptionsExtended = {}): Promise<AutotaskBillingCode[]> {
    throw new Error('Billing codes API not directly available in autotask-node library');
  }

  async getDepartment(_id: number): Promise<AutotaskDepartment | null> {
    throw new Error('Departments API not directly available in autotask-node library');
  }

  async searchDepartments(_options: AutotaskQueryOptionsExtended = {}): Promise<AutotaskDepartment[]> {
    throw new Error('Departments API not directly available in autotask-node library');
  }
}
