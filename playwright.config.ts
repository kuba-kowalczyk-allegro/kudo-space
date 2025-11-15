import { defineConfig } from "@playwright/test";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4321";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  reporter: [["list"], ["html", { outputFolder: "tests/e2e/.reports" }]],
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    storageState: path.join(process.cwd(), "tests/e2e/.auth/state.json"),
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
});
