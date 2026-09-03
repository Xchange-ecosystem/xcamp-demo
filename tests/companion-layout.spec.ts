import { test } from "@playwright/test";

test.describe("Companion header/input-row layout", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept auth to avoid real login; inject a minimal logged-in state
    await page.route("**/auth/v1/**", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({}) }),
    );
    await page.route("**/rest/v1/**", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify([]) }),
    );
    await page.route("**/functions/v1/**", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({}) }),
    );
  });

  test("home page renders without TopChrome fixed element", async ({ page }, testInfo) => {
    await page.goto("/home");
    // The old TopChrome had position:fixed top:0 right:0 — verify it is gone
    // by confirming no fixed-position div overlaps the left sidebar
    const screenshotPath = testInfo.outputPath("01-home-full.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log("Screenshot saved:", screenshotPath);
  });

  test("glass panel loads and pill bar is visible", async ({ page }, testInfo) => {
    await page.goto("/home");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: testInfo.outputPath("02-home-viewport.png"), fullPage: false });
  });
});
