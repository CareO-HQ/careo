import { defineConfig, devices } from "@playwright/test";
import { assertLocalSupabase, readTestEnv } from "./tests/db/env";

// E2E always runs against local Supabase; these values override .env.local in the dev server.
const testEnv = readTestEnv();
assertLocalSupabase(testEnv.NEXT_PUBLIC_SUPABASE_URL);
Object.assign(process.env, testEnv);

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev --turbopack -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: true,
    env: { ...testEnv, NEXT_PUBLIC_BASE_URL: `http://localhost:${PORT}` },
  },
});
