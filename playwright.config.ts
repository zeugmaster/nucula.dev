import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  timeout: 30000,
  use: { baseURL: "http://localhost:3000", headless: true },
  webServer: {
    command: "npm run dev -- --port 3000",
    url: "http://localhost:3000/setup",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
