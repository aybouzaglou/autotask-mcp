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