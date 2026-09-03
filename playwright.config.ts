import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const proxyServer = process.env.HTTPS_PROXY;
const chromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "playwright-report/results.xml" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    video: "retain-on-failure",
    headless: true,
    ...(proxyServer
      ? {
          proxy: {
            server: proxyServer,
            bypass: "localhost,127.0.0.1",
          },
        }
      : {}),
    launchOptions: {
      ...(existsSync(chromiumPath) ? { executablePath: chromiumPath } : {}),
      args: [
        "--ignore-certificate-errors",
        ...(proxyServer
          ? [`--proxy-server=${proxyServer}`, "--proxy-bypass-list=localhost;127.0.0.1"]
          : []),
      ],
    },
  },
  webServer: {
    command: process.env.PW_WEB_SERVER_CMD ?? "bun run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
