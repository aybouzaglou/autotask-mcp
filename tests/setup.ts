// Jest Setup File
// Configure test environment and global settings

import { config } from 'dotenv';

// Load environment variables from .env file if it exists
config();

// Set test timeout for longer-running API tests
jest.setTimeout(30000);

// Global test setup
beforeAll(() => {
  // Suppress console.log during tests unless explicitly testing logging
  if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

// Global test cleanup
afterAll(() => {
  // Any cleanup operations
});

// Ticket metadata fixtures for testing
export const MOCK_TICKET_STATUSES = [
  { id: 1, name: 'New', isActive: true },
  { id: 2, name: 'In Progress', isActive: true },
  { id: 5, name: 'Complete', isActive: true },
  { id: 7, name: 'Waiting Customer', isActive: true },
  { id: 8, name: 'Waiting Vendor', isActive: true },
  { id: 9, name: 'Escalated', isActive: true }
];

export const MOCK_TICKET_PRIORITIES = [
  { id: 1, name: 'Low', isActive: true },
  { id: 2, name: 'Medium', isActive: true },
  { id: 3, name: 'High', isActive: true },
  { id: 4, name: 'Critical', isActive: true },
  { id: 5, name: 'Urgent', isActive: true }
];

export const MOCK_ACTIVE_RESOURCES = [
  { id: 100, firstName: 'John', lastName: 'Doe', isActive: true, email: 'john.doe@example.com' },
  { id: 101, firstName: 'Jane', lastName: 'Smith', isActive: true, email: 'jane.smith@example.com' },
  { id: 102, firstName: 'Bob', lastName: 'Johnson', isActive: true, email: 'bob.johnson@example.com' }
];

export const MOCK_INACTIVE_RESOURCES = [
  { id: 200, firstName: 'Inactive', lastName: 'User', isActive: false, email: 'inactive@example.com' }
];
