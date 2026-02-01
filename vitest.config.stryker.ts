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
      // CLI invocation tests require compiled dist/cli.js (not in Stryker sandbox)
      'tests/cli/add-template.test.ts',
      'tests/cli/create-template.test.ts',
      'tests/cli/setup-mcp.test.ts',
      'tests/cli/validate-template.test.ts',
    ],
    setupFiles: ['./tests/setup.ts'],
  },
});
