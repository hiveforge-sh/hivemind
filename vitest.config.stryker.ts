import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: [
      'node_modules',
      'dist',
      'tests/templates/loader.test.ts',
    ],
    setupFiles: ['./tests/setup.ts'],
  },
});
