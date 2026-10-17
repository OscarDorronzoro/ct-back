import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{js,ts}'],
    environment: 'node',
    // Spies created with vi.spyOn are undone after each test
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/**/*.test.{js,ts}'],
    },
  },
});
