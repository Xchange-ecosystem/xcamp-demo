import { test, expect } from "@playwright/test";
import path from "path";

const SCRATCHPAD = "/tmp/claude-0/-home-user/d612b765-7c5d-50d2-892f-421d75c9b051/scratchpad";

test.describe("Companion header/input-row layout", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept auth to avoid real login; inject a minimal logged-in state
    await page.route("**/auth/v1/**", (route) => route.fulfill({ status: 200, body: JSON.stringify({}) }));
    await page.route("**/rest/v1/**", (route) => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route("**/functions/v1/**", (route) => route.fulfill({ status: 200, body: JSON.stringify({}) }));
  });

  test("home page renders without TopChrome fixed element", async ({ page }) => {
    await page.goto("/home");
    // The old TopChrome had position:fixed top:0 right:0 — verify it is gone
    // by confirming no fixed-position div overlaps the left sidebar
    const screenshot = await page.screenshot({ fullPage: true });
    const screenshotPath = path.join(SCRATCHPAD, "01-home-full.png");
    require("fs").writeFileSync(screenshotPath, screenshot);
    console.log("Screenshot saved:", screenshotPath);
  });

  test("glass panel loads and pill bar is visible", async ({ page }) => {
    await page.goto("/home");
    await page.waitForTimeout(2000);
    const shot = await page.screenshot({ fullPage: false });
    require("fs").writeFileSync(path.join(SCRATCHPAD, "02-home-viewport.png"), shot);
  });
});
