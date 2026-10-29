import { defineConfig, devices } from '@playwright/test';

// Smoke sugli emulatori: si lancia con `npm test` (emulatori + seed + questi test).
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4101',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev:emulator',
    url: 'http://localhost:4101',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
