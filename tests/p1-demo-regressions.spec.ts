import { expect, test, type Page } from "@playwright/test";
import { installLiveHarness } from "./helpers/liveAuth";

const EXTRACTION_RESPONSE = {
  people: [
    {
      id: "person-7",
      name: "Elena Vasquez",
      initials: "EV",
      role: "Product designer",
      matched: true,
      email: "elena@example.test",
      tasks: [
        { id: "extracted-1", title: "Review notification UX", est: "3h", due: "9 Sep" },
        { id: "extracted-2", title: "Prepare clinic materials", est: "2h", due: "10 Sep" },
      ],
    },
  ],
};

async function installExtractionResponse(page: Page, body: unknown) {
  await page.unroute("**xcampapi.xchange.eco/**");
  await page.route("**xcampapi.xchange.eco/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.route("**xcampapi.xchange.eco/api/transcripts/extract", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

test.describe("P1 PR #144–#149 regressions", () => {
  test.beforeEach(async ({ page }) => {
    await installLiveHarness(page);
  });

  test("collaborator terms actions preserve Not now and apply Decline", async ({ page }) => {
    await page.goto("/demo/collaborator");

    const assignment = () =>
      page.getByRole("listitem").filter({ hasText: "Fix ARM64 quantization regression" });

    await assignment().getByRole("button", { name: "Review terms" }).click();
    await expect(page.getByRole("dialog", { name: "Binding terms offered" })).toBeVisible();
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(assignment()).toBeVisible();

    await assignment().getByRole("button", { name: "Decline" }).click();
    await expect(assignment()).toHaveCount(0);
    await expect(page.getByText("Terms declined")).toBeVisible();
  });

  test("transcript sample follows Review, Preview, Send and keeps its project", async ({
    page,
  }) => {
    await installExtractionResponse(page, EXTRACTION_RESPONSE);
    await page.goto("/demo/founder");

    await page.getByRole("button", { name: "Transcript" }).click();
    await expect(page.getByText(/sending is simulated/i)).toBeVisible();
    await page.getByLabel("Or use a demo transcript").selectOption("transcript-2");
    await page.getByRole("button", { name: "Send to Chi" }).click();

    await expect(page.getByText("Elena Vasquez").first()).toBeVisible();
    await expect(page.locator('[data-step="review"]')).toHaveAttribute("data-state", "on");
    await page.getByRole("button", { name: "Build previews" }).click();
    await expect(page.locator('[data-step="preview"]')).toHaveAttribute("data-state", "on");
    await expect(page.locator('[data-step="send"]')).toHaveAttribute("data-state", "pending");

    await expect(page.getByText(/no email leaves the browser/i)).toBeVisible();
    await page.getByRole("button", { name: "Simulate 1 email" }).click();
    await expect(page.getByRole("heading", { name: "Ready to add" })).toBeVisible();
    await page.getByRole("button", { name: "Add to feed" }).click();

    const extractedCard = page.getByRole("listitem").filter({ hasText: "Review notification UX" });
    await expect(extractedCard).toBeVisible();
    await expect(extractedCard).toContainText("Loopwell Health");
  });

  test("empty extraction response becomes a recoverable error", async ({ page }) => {
    await installExtractionResponse(page, { people: [] });
    await page.goto("/demo/founder");

    await page.getByRole("button", { name: "Transcript" }).click();
    await page.getByLabel("Or use a demo transcript").selectOption("transcript-1");
    await page.getByRole("button", { name: "Send to Chi" }).click();

    await expect(page.getByText("Extraction failed")).toBeVisible();
    await expect(page.getByText(/could not find any assigned work/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("portfolio replay stops as soon as the last week is reached", async ({ page }) => {
    await page.goto("/demo/investor/portfolio");
    await page.getByLabel("Week").fill("7");
    await page.clock.install();

    await page.getByRole("button", { name: "Replay 8 weeks" }).click();
    await page.clock.runFor(7 * 900 + 1);

    await expect(page.getByLabel("Week")).toHaveValue("7");
    await expect(page.getByRole("button", { name: "Replay 8 weeks" })).toBeVisible();
  });

  test("portfolio replay stays still when reduced motion is requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/demo/investor/portfolio");

    await expect(page.getByLabel("Week")).toHaveValue("7");
    await page.getByRole("button", { name: "Replay 8 weeks" }).click();
    await expect(page.getByLabel("Week")).toHaveValue("7");
  });
});
