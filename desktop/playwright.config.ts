import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false, // Electron 单实例，不能并行
  reporter: 'list',
  globalSetup: './tests/setup.ts',
  globalTeardown: './tests/teardown.ts',
});
