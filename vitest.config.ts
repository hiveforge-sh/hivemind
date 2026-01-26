import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/types/**',
        'src/cli.ts',
        'src/server.ts',
      ],
      thresholds: {
        branches: 30,
        functions: 55,
        lines: 40,
        statements: 40,
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
