import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: ['--max-old-space-size=4096'],
      },
    },
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['core.js', 'app.js', 'mock-api.js', 'plugins/**/*.js'],
      exclude: ['plugins/gen-mock.ps1', 'plugins/mock-api.js'],
      reportsDirectory: './coverage',
    },
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname),
    },
  },
});