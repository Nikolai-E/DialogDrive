import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const poolEnv = process.env.VITEST_POOL;
const pool: 'threads' | 'forks' | 'vmThreads' =
  poolEnv === 'threads' || poolEnv === 'forks' || poolEnv === 'vmThreads'
    ? poolEnv
    : process.env.CI
      ? 'threads'
      : 'vmThreads';

export default defineConfig({
  resolve: {
    alias: {
      '@': r('./'),
      '~': r('./entrypoints/popup'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    pool,
    setupFiles: ['tests/setupTests.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/floating-save/**/*.test.ts'],
    exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
    reporters: [
      'default',
      [
        'junit',
        {
          outputFile: 'reports/vitest-junit.xml',
        },
      ],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: 'reports/coverage',
      thresholds: {
        lines: 0.7,
        functions: 0.65,
        branches: 0.6,
        statements: 0.7,
      },
    },
  },
});
