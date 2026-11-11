import { defineConfig, devices } from '@playwright/test';

// The scenarios run against the built site (`npx next build` first), the same
// code that is deployed, not the development server.
const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'off',
    // Set E2E_BROWSER_EXECUTABLE to run with a Chromium that is already
    // installed instead of the one `npx playwright install` downloads.
    ...(process.env.E2E_BROWSER_EXECUTABLE ? { launchOptions: { executablePath: process.env.E2E_BROWSER_EXECUTABLE } } : {})
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: `npx next start --hostname 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/robots.txt`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
