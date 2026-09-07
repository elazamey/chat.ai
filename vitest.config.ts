import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'kernel/**/src/**/*.test.ts',
      'runtime/**/src/**/*.test.ts',
      'plugins/**/src/**/*.test.ts',
      'adapters/**/src/**/*.test.ts',
      'storage/**/src/**/*.test.ts',
      'apps/**/src/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    environment: 'node',
  },
});
