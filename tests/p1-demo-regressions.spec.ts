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
    await expect(
      page.getByText("2 sketch assignments are ready to add", { exact: false }),
    ).toBeVisible();
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

  test("malformed extraction fields are rejected and retry recovers", async ({ page }) => {
    const malformed = [
      { ...EXTRACTION_RESPONSE.people[0], id: "   " },
      { ...EXTRACTION_RESPONSE.people[0], name: "   " },
      {
        ...EXTRACTION_RESPONSE.people[0],
        tasks: [{ ...EXTRACTION_RESPONSE.people[0].tasks[0], id: " " }],
      },
      {
        ...EXTRACTION_RESPONSE.people[0],
        tasks: [{ ...EXTRACTION_RESPONSE.people[0].tasks[0], title: "  " }],
      },
      {
        ...EXTRACTION_RESPONSE.people[0],
        tasks: [
          EXTRACTION_RESPONSE.people[0].tasks[0],
          { ...EXTRACTION_RESPONSE.people[0].tasks[0], id: " extracted-1 " },
        ],
      },
    ];
    await installExtractionResponse(page, { people: [malformed[0]] });
    await page.goto("/demo/founder");
    await page.getByRole("button", { name: "Transcript", exact: true }).click();
    await page.getByLabel("Or use a demo transcript").selectOption("transcript-1");
    await page.getByRole("button", { name: "Send to Chi" }).click();
    await expect(page.getByText("Extraction failed", { exact: true })).toBeVisible();

    for (const person of malformed.slice(1)) {
      await installExtractionResponse(page, { people: [person] });
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await expect(page.getByText("Extraction failed", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Build previews" })).toHaveCount(0);
    }

    // Missing estimates, deadlines and addresses are editable/optional metadata.
    const recovered = structuredClone(EXTRACTION_RESPONSE);
    recovered.people[0].tasks[0].est = "";
    recovered.people[0].tasks[0].due = "";
    recovered.people[0].email = "";
    await installExtractionResponse(page, recovered);
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Transcript to assignments" });
    await expect(dialog.getByRole("button", { name: "Build previews" })).toBeDisabled();
    await dialog.getByLabel("Email", { exact: true }).fill("elena@example.test");
    await expect(dialog.getByRole("button", { name: "Build previews" })).toBeEnabled();
  });

  test("transcript upload validation recovers with a supported file", async ({ page }) => {
    await page.goto("/demo/founder");
    await page.getByRole("button", { name: "Transcript", exact: true }).click();
    const input = page.locator('input[type="file"][accept*=".vtt"]');
    const cases = [
      { name: "meeting.pdf", buffer: Buffer.from("contents"), message: /TXT, VTT, or SRT/ },
      { name: "empty.txt", buffer: Buffer.alloc(0), message: /transcript is empty/ },
      { name: "blank.txt", buffer: Buffer.from("   "), message: /no readable text/ },
      {
        name: "large.txt",
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1, "x"),
        message: /larger than 5 MB/,
      },
    ];
    for (const entry of cases) {
      await input.setInputFiles({ name: entry.name, mimeType: "text/plain", buffer: entry.buffer });
      await expect(page.getByRole("alert")).toContainText(entry.message);
      await expect(page.getByRole("button", { name: "Send to Chi" })).toHaveCount(0);
    }
    await input.setInputFiles({
      name: "meeting.VTT",
      mimeType: "text/vtt",
      buffer: Buffer.from("WEBVTT\n\n00:00.000 --> 00:02.000\nElena will review the UX."),
    });
    await expect(page.getByText("meeting.VTT", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send to Chi" })).toBeEnabled();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("proposal acceptance requires a title, estimate and positive integer credits", async ({
    page,
  }) => {
    await page.goto("/demo/founder");
    await page.getByRole("button", { name: "Review", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Chi proposes a task" });
    const accept = dialog.getByRole("button", { name: "Accept as sketch" });
    await dialog.getByLabel("Task", { exact: true }).fill("   ");
    await expect(accept).toBeDisabled();
    await dialog.getByLabel("Task", { exact: true }).fill("  Validated proposal  ");
    await dialog.getByLabel("Time", { exact: true }).fill("");
    await expect(accept).toBeDisabled();
    await dialog.getByLabel("Time", { exact: true }).fill("2h");
    for (const invalidValue of ["", "0", "-1", "1.5"]) {
      await dialog.getByLabel("Value", { exact: true }).fill(invalidValue);
      await expect(accept).toBeDisabled();
    }
    await dialog.getByLabel("Value", { exact: true }).fill("125");
    await expect(accept).toBeEnabled();
    await accept.click();
    await expect(dialog).toHaveCount(0);
    const card = page.getByRole("listitem").filter({ hasText: "Validated proposal" });
    await expect(card).toContainText("125 cr");
  });

  test("a delayed upload cannot replace a newer sample selection", async ({ page }) => {
    await page.addInitScript(() => {
      const originalText = File.prototype.text;
      File.prototype.text = function () {
        if (this.name !== "delayed.txt") return originalText.call(this);
        return new Promise<string>((resolve) => {
          Object.assign(window, { finishTranscriptRead: () => resolve("Old transcript contents") });
        });
      };
    });
    await page.goto("/demo/founder");
    await page.getByRole("button", { name: "Transcript", exact: true }).click();
    await page.locator('input[type="file"][accept*=".vtt"]').setInputFiles({
      name: "delayed.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Old transcript contents"),
    });
    await page.waitForFunction(() => "finishTranscriptRead" in window);
    await page.getByLabel("Or use a demo transcript").selectOption("transcript-2");
    await page.evaluate(async () => {
      (window as unknown as { finishTranscriptRead: () => void }).finishTranscriptRead();
      await new Promise(requestAnimationFrame);
    });
    await expect(
      page.getByText("Loopwell Health — clinical + product check-in.txt", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("delayed.txt", { exact: true })).toHaveCount(0);
  });

  test("closing an in-flight extraction discards its result", async ({ page }) => {
    await page.goto("/demo/founder");
    await page.getByRole("button", { name: "Transcript", exact: true }).click();
    await page.getByLabel("Or use a demo transcript").selectOption("transcript-1");
    let releaseResponse: (() => void) | undefined;
    const released = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    await page.route("**/api/transcripts/extract", async (route) => {
      await released;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EXTRACTION_RESPONSE),
      });
    });
    const request = page.waitForRequest("**/api/transcripts/extract");
    await page.getByRole("button", { name: "Send to Chi" }).click();
    await request;
    const dialog = page.getByRole("dialog", { name: "Transcript to assignments" });
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toHaveCount(1);
    const failed = page.waitForEvent("requestfailed", (request) =>
      request.url().endsWith("/api/transcripts/extract"),
    );
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    releaseResponse?.();
    await failed;
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("listitem").filter({ hasText: "Review notification UX" }),
    ).toHaveCount(0);
  });

  test("portfolio replay stops as soon as the last week is reached", async ({ page }) => {
    await page.goto("/demo/investor/portfolio");
    await page.getByLabel("Week").fill("7");
    await page.clock.install();

    await page.getByRole("button", { name: "Replay 8 weeks" }).click();
    await page.clock.runFor(900);
    await expect(page.getByLabel("Week")).toHaveValue("1");
    await page.clock.runFor(6 * 900 + 1);

    await expect(page.getByLabel("Week")).toHaveValue("7");
    await expect(page.getByRole("button", { name: "Replay 8 weeks" })).toBeVisible();
  });

  test("enabling reduced motion stops an active replay", async ({ page }) => {
    await page.goto("/demo/investor/portfolio");
    await page.getByLabel("Week").fill("7");
    await page.clock.install();
    await page.getByRole("button", { name: "Replay 8 weeks" }).click();
    await page.clock.runFor(900);
    await expect(page.getByLabel("Week")).toHaveValue("1");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByLabel("Week")).toHaveValue("7");
    await expect(page.getByRole("button", { name: "Replay 8 weeks" })).toBeVisible();
    await page.clock.runFor(1800);
    await expect(page.getByLabel("Week")).toHaveValue("7");
  });

  test("portfolio replay stays still when reduced motion is requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/demo/investor/portfolio");

    await expect(page.getByLabel("Week")).toHaveValue("7");
    await page.getByRole("button", { name: "Replay 8 weeks" }).click();
    await expect(page.getByLabel("Week")).toHaveValue("7");
  });
});
