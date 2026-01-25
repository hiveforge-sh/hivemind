// Global test setup
import '@jest/globals';

// Suppress console.error in tests unless explicitly needed
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Set test timeout
jest.setTimeout(10000);
