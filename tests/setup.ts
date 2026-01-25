// Global test setup
import { beforeEach, afterEach } from 'vitest';

// Set test timeout
beforeEach(() => {
  // Suppress console output in tests unless explicitly needed
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
