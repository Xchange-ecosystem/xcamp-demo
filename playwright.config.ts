import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    video: "retain-on-failure",
    headless: true,
    proxy: {
      server: process.env.HTTPS_PROXY ?? "http://127.0.0.1:37657",
      bypass: "localhost,127.0.0.1",
    },
    launchOptions: {
      executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
      args: [
        "--ignore-certificate-errors",
        `--proxy-server=${process.env.HTTPS_PROXY ?? "http://127.0.0.1:37657"}`,
        "--proxy-bypass-list=localhost;127.0.0.1",
      ],
    },
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
