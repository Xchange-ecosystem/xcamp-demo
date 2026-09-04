import { test, expect } from "@playwright/test";
import { installLiveHarness } from "./helpers/liveAuth";

test.describe("Journal/Notes composer view is reflected in the URL", () => {
  test.beforeEach(async ({ page }) => {
    await installLiveHarness(page);
    page.on("pageerror", (e) => console.log("[PAGE ERROR]", e.message));
  });

  test("direct load of /journal?new=1 lands on the composer (not just client nav)", async ({
    page,
  }) => {
    await page.goto("/journal?new=1");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
    await expect(
      page.getByRole("heading", { name: /Record, type or paste a new entry/i }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get("new")).toBe("1");
  });

  test("direct load of /notes?new=1 lands on the composer (not just client nav)", async ({
    page,
  }) => {
    await page.goto("/notes?new=1");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
    // NoteEditor's title field is the clearest composer signal.
    await expect(page.getByPlaceholder("Note title")).toBeVisible();
    expect(new URL(page.url()).searchParams.get("new")).toBe("1");
  });

  test("in-page Journal '+ New entry' button updates the URL, and back/forward works", async ({
    page,
  }) => {
    await page.goto("/journal");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
    expect(new URL(page.url()).searchParams.get("new")).toBeNull();

    // The in-page panel's own button (not the app sidebar).
    await page.locator("aside button", { hasText: "New entry" }).click();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.get("new")).toBe("1");

    // Now open a history session (if any) to exit the composer, or simulate
    // via back navigation. Go back — should return to plain /journal.
    await page.goBack();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.get("new")).toBeNull();

    // Forward — should return to the composer URL.
    await page.goForward();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.get("new")).toBe("1");
    await expect(
      page.getByRole("heading", { name: /Record, type or paste a new entry/i }),
    ).toBeVisible();
  });

  test("in-page Notes '+ New note' button updates the URL, and back/forward works", async ({
    page,
  }) => {
    await page.goto("/notes");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
    expect(new URL(page.url()).searchParams.get("new")).toBeNull();
    await expect(page.getByText("Select a note or create a new one.")).toBeVisible();

    await page.locator("aside button", { hasText: "New note" }).click();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.get("new")).toBe("1");
    await expect(page.getByPlaceholder("Note title")).toBeVisible();

    await page.goBack();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.get("new")).toBeNull();
    await expect(page.getByText("Select a note or create a new one.")).toBeVisible();

    await page.goForward();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.get("new")).toBe("1");
    await expect(page.getByPlaceholder("Note title")).toBeVisible();
  });

  test("clicking a Journal history session exits the composer and clears ?new=1", async ({
    page,
  }) => {
    await page.route("**/rest/v1/organiser_sessions**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "0-0/1" },
        body: JSON.stringify([
          {
            id: "sess-1",
            user_id: "00000000-0000-4000-8000-000000000001",
            source: "journal",
            created_at: "2026-01-01T00:00:00Z",
          },
        ]),
      }),
    );
    await page.route("**/rest/v1/organiser_proposals**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );

    await page.goto("/journal?new=1");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
    expect(new URL(page.url()).searchParams.get("new")).toBe("1");

    await page.locator("aside button", { hasText: "Jan 1" }).click();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.get("new")).toBeNull();
  });
});
