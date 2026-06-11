import { defineConfig, devices } from "@playwright/test";

const e2eBaseUrl = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    env: {
      ...process.env,
      PORTFOLIO_USE_FIXTURES: "true"
    },
    url: e2eBaseUrl,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
