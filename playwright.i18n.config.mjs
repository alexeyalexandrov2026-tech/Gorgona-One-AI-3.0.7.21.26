import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  testDir: './e2e/i18n',
  outputDir: process.env.I18N_TEST_OUTPUT_DIR || path.join(os.tmpdir(), 'miami-elio-i18n-e2e'),
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 90000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        args: JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS || '[]') } : {},
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true } }
  ],
  webServer: {
    command: 'node scripts/i18n/run-pilot.mjs start',
    url: 'http://127.0.0.1:3100/i18n-pilot',
    reuseExistingServer: false,
    timeout: 60000
  }
});
