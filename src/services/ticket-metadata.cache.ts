// Ticket Metadata Cache Service
// Caches statuses, priorities, and resources for validation and enhanced responses

import { Logger } from '../utils/logger.js';
import { AutotaskClient } from 'autotask-node';

export interface TicketStatus {
  id: number;
  name: string;
  isActive: boolean;
  isSystem?: boolean;
}

export interface TicketPriority {
  id: number;
  name: string;
  isActive: boolean;
  isSystem?: boolean;
}

export interface CachedResource {
  id: number;
  firstName: string;
  lastName: string;
  isActive: boolean;
  email?: string;
}

export interface MetadataCacheStats {
  statuses: number;
  priorities: number;
  resources: number;
  lastRefresh: Date | null;
  nextRefresh: Date | null;
}

export class TicketMetadataCache {
  private statuses: Map<number, TicketStatus> = new Map();
  private priorities: Map<number, TicketPriority> = new Map();
  private resources: Map<number, CachedResource> = new Map();
  private lastRefresh: Date | null = null;
  private refreshInterval: number = 15 * 60 * 1000; // 15 minutes
  private refreshTimer: NodeJS.Timeout | null = null;
  private logger: Logger;
  private client: AutotaskClient | null = null;
  private isInitialized: boolean = false;

  constructor(logger: Logger, refreshIntervalMinutes: number = 15) {
    this.logger = logger;
    this.refreshInterval = refreshIntervalMinutes * 60 * 1000;
  }

  /**
   * Initialize the cache with an Autotask client
   */
  setClient(client: AutotaskClient): void {
    this.client = client;
  }

  /**
   * Load metadata from Autotask and start refresh schedule
   */
  async initialize(): Promise<void> {
    if (!this.client) {
      throw new Error('Autotask client not set. Call setClient() before initialize()');
    }

    if (this.isInitialized) {
      this.logger.debug('Metadata cache already initialized');
      return;
    }

    this.logger.info('Initializing ticket metadata cache...');

    try {
      await this.refresh();
      this.scheduleRefresh();
      this.isInitialized = true;
      this.logger.info('Ticket metadata cache initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize metadata cache:', error);
      throw error;
    }
  }

  /**
   * Refresh all cached metadata from Autotask
   */
  async refresh(): Promise<void> {
    if (!this.client) {
      throw new Error('Autotask client not available for refresh');
    }

    this.logger.debug('Refreshing ticket metadata cache...');

    try {
      // Refresh statuses, priorities, and resources in parallel
      await Promise.all([this.refreshStatuses(), this.refreshPriorities(), this.refreshResources()]);

      this.lastRefresh = new Date();
      this.logger.info(
        `Metadata cache refreshed: ${this.statuses.size} statuses, ${this.priorities.size} priorities, ${this.resources.size} resources`,
      );
    } catch (error) {
      this.logger.error('Failed to refresh metadata cache:', error);
      throw error;
    }
  }

  /**
   * Refresh ticket statuses
   */
  private async refreshStatuses(): Promise<void> {
    if (!this.client) return;

    // Note: Autotask API doesn't expose a direct statuses endpoint via autotask-node
    // Using default statuses for now. In production, this could be extended to use
    // picklist API endpoints or other methods.
    this.logger.debug('Using default ticket statuses (Autotask API limitation)');
    this.populateDefaultStatuses();
  }

  /**
   * Populate default statuses as fallback
   */
  private populateDefaultStatuses(): void {
    const defaults: TicketStatus[] = [
      { id: 1, name: 'New', isActive: true, isSystem: true },
      { id: 2, name: 'In Progress', isActive: true, isSystem: true },
      { id: 5, name: 'Complete', isActive: true, isSystem: true },
      { id: 7, name: 'Waiting Customer', isActive: true, isSystem: true },
      { id: 8, name: 'Waiting Vendor', isActive: true, isSystem: true },
      { id: 9, name: 'Escalated', isActive: true, isSystem: true },
    ];

    this.statuses.clear();
    defaults.forEach((status) => {
      this.statuses.set(status.id, status);
    });
  }

  /**
   * Refresh ticket priorities
   */
  private async refreshPriorities(): Promise<void> {
    if (!this.client) return;

    // Note: Autotask API doesn't expose a direct priorities endpoint via autotask-node
    // Using default priorities for now. In production, this could be extended to use
    // picklist API endpoints or other methods.
    this.logger.debug('Using default ticket priorities (Autotask API limitation)');
    this.populateDefaultPriorities();
  }

  /**
   * Populate default priorities as fallback
   */
  private populateDefaultPriorities(): void {
    const defaults: TicketPriority[] = [
      { id: 1, name: 'Low', isActive: true, isSystem: true },
      { id: 2, name: 'Medium', isActive: true, isSystem: true },
      { id: 3, name: 'High', isActive: true, isSystem: true },
      { id: 4, name: 'Critical', isActive: true, isSystem: true },
      { id: 5, name: 'Urgent', isActive: true, isSystem: true },
    ];

    this.priorities.clear();
    defaults.forEach((priority) => {
      this.priorities.set(priority.id, priority);
    });
  }

  /**
   * Refresh active resources
   */
  private async refreshResources(): Promise<void> {
    if (!this.client) return;

    try {
      // Add timeout to prevent hanging on slow/broken resource endpoint
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Resource fetch timeout after 10s')), 10000);
      });

      const fetchPromise = this.client.resources.list({ filter: { isActive: true } } as any);

      const result = (await Promise.race([fetchPromise, timeoutPromise])) as any;
      const resources = (result.data || []) as CachedResource[];

      this.resources.clear();
      resources.forEach((resource) => {
        this.resources.set(resource.id, resource);
      });

      this.logger.debug(`Loaded ${this.resources.size} active resources`);
    } catch (error) {
      this.logger.warn('Could not fetch resources from Autotask (will use empty cache):', error);
      // Resources cache remains empty or stale - this is OK for validation
      this.resources.clear();
    }
  }

  /**
   * Schedule periodic refresh
   */
  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      try {
        await this.refresh();
      } catch (error) {
        this.logger.error('Scheduled metadata refresh failed:', error);
      }
    }, this.refreshInterval);
  }

  /**
   * Stop refresh schedule and clear cache
   */
  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.isInitialized = false;
    this.logger.info('Metadata cache stopped');
  }

  /**
   * Get a status by ID
   */
  getStatus(id: number): TicketStatus | undefined {
    return this.statuses.get(id);
  }

  /**
   * Get all statuses
   */
  getAllStatuses(): TicketStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Validate if a status ID is valid
   */
  isValidStatus(id: number): boolean {
    return this.statuses.has(id);
  }

  /**
   * Get a priority by ID
   */
  getPriority(id: number): TicketPriority | undefined {
    return this.priorities.get(id);
  }

  /**
   * Get all priorities
   */
  getAllPriorities(): TicketPriority[] {
    return Array.from(this.priorities.values());
  }

  /**
   * Validate if a priority ID is valid
   */
  isValidPriority(id: number): boolean {
    return this.priorities.has(id);
  }

  /**
   * Get a resource by ID
   */
  getResource(id: number): CachedResource | undefined {
    return this.resources.get(id);
  }

  /**
   * Get all resources
   */
  getAllResources(): CachedResource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Validate if a resource ID is valid and active
   */
  isValidResource(id: number): boolean {
    const resource = this.resources.get(id);
    return resource !== undefined && resource.isActive;
  }

  /**
   * Get cache statistics
   */
  getStats(): MetadataCacheStats {
    const nextRefresh = this.lastRefresh ? new Date(this.lastRefresh.getTime() + this.refreshInterval) : null;

    return {
      statuses: this.statuses.size,
      priorities: this.priorities.size,
      resources: this.resources.size,
      lastRefresh: this.lastRefresh,
      nextRefresh,
    };
  }

  /**
   * Check if cache is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
