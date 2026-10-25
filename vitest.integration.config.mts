import { defineConfig } from 'vitest/config';

// Integration tests (npm run test:integration): the API and the jobs against a real PostgreSQL +
// PostGIS in Docker, with the schema of production and deploy.sql. See test/integration/globalSetup.
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    globalSetup: ['test/integration/globalSetup.ts'],
    setupFiles: ['test/integration/setup.ts'],
    // One database: the files one after another
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
