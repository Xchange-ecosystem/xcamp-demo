// B4 Stage 3 live verification — Readiness and Data Room, both first builds.
//
// The load-bearing test here is the last one: Club Deal Finder's Shortlist
// stage claims to unlock a project's Data Room, and that claim is only true if
// the link actually lands on that project's room. Asserting the two screens
// agree is the point of the stage, so it is checked end to end rather than by
// confirming each screen renders on its own.
import { expect, test } from "@playwright/test";
import { RENDER_TIMEOUT, isBackendRequest, isOffAppRequest, isRealPageError } from "./net-guards";

const READINESS = "/demo/investor/microapps/readiness";
const DATA_ROOM = "/demo/investor/microapps/data-room";
const CLUB_DEAL = "/demo/investor/microapps/club-deal-finder";

test.describe("B4 Stage 3 — Readiness", () => {
  test("shows evidence by dimension and a derived gap list", async ({ page }, testInfo) => {
    const backend: string[] = [];
    const offApp: string[] = [];
    const pageErrors: string[] = [];
    page.on("request", (req) => {
      if (isBackendRequest(req)) backend.push(req.url());
      if (isOffAppRequest(req)) offApp.push(req.url());
    });
    page.on("pageerror", (err) => {
      if (isRealPageError(err)) pageErrors.push(String(err));
    });

    await page.goto(READINESS, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Readiness" })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });

    // Every real Objective.dimension gets a row.
    for (const dimension of ["Market", "Product", "Operations", "Business", "Team"]) {
      await expect(
        page.getByText(dimension, { exact: true }).first(),
        `${dimension} row`,
      ).toBeVisible();
    }

    // Solari has externally assessed completions in Market and Operations, so
    // at least one dimension must read Strong — proving the assessment reads
    // hasExternalAssessor rather than being hardcoded.
    await expect(page.getByText("Strong", { exact: true }).first()).toBeVisible();

    // The gap list is the deliverable, and it is investor-framed.
    await expect(
      page.getByRole("heading", { name: "What would stall a term sheet" }),
    ).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath("readiness.png"), fullPage: true });
    await testInfo.attach("readiness", {
      path: testInfo.outputPath("readiness.png"),
      contentType: "image/png",
    });

    await page.waitForTimeout(1200);
    expect(backend, "readiness reached a backend").toEqual([]);
    expect(offApp, "readiness made off-app requests").toEqual([]);
    expect(pageErrors, "readiness console errors").toEqual([]);
  });

  test("switching project re-derives the table", async ({ page }) => {
    await page.goto(READINESS, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Readiness" })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });

    // Fernbase Studio has two objectives, neither completed — so it must show
    // gaps Solari does not, rather than the same table with a new title.
    await page.getByRole("button", { name: /Fernbase Studio/ }).click();
    await expect(page.getByText("No evidence", { exact: true }).first()).toBeVisible();
  });
});

test.describe("B4 Stage 3 — Data Room", () => {
  test("lists documents grouped by objective, locks watchlist projects", async ({
    page,
  }, testInfo) => {
    const backend: string[] = [];
    const offApp: string[] = [];
    const pageErrors: string[] = [];
    page.on("request", (req) => {
      if (isBackendRequest(req)) backend.push(req.url());
      if (isOffAppRequest(req)) offApp.push(req.url());
    });
    page.on("pageerror", (err) => {
      if (isRealPageError(err)) pageErrors.push(String(err));
    });

    await page.goto(DATA_ROOM, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Data Room" })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });

    // Real authored documents, grouped under the objective they evidence.
    await expect(page.getByText("ISO 9001 certificate — contract manufacturer")).toBeVisible();
    await expect(page.getByText("Secure ISO 9001 manufacturing partner")).toBeVisible();
    await expect(page.getByText("Project-level")).toBeVisible();

    // The gate is stated, not hidden: watchlist-stage projects are named as locked.
    await expect(page.getByText(/Locked, still on your watchlist/)).toBeVisible();
    await expect(page.getByText(/Fernbase Studio/)).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath("data-room.png"), fullPage: true });
    await testInfo.attach("data-room", {
      path: testInfo.outputPath("data-room.png"),
      contentType: "image/png",
    });

    await page.waitForTimeout(1200);
    expect(backend, "data room reached a backend").toEqual([]);
    expect(offApp, "data room made off-app requests").toEqual([]);
    expect(pageErrors, "data room console errors").toEqual([]);
  });

  test("locked projects are not selectable", async ({ page }) => {
    await page.goto(DATA_ROOM, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Data Room" })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });

    // Fernbase Studio is watchlist-stage: named in the locked line, but never
    // offered as a picker button.
    await expect(page.getByRole("button", { name: /Fernbase Studio/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Solari Energy/ })).toBeVisible();
  });

  test("a stale or locked ?project= falls back instead of erroring", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => {
      if (isRealPageError(err)) pageErrors.push(String(err));
    });

    // proj-4 is locked; nonsense-id does not exist. Neither may break the page.
    for (const bad of ["proj-4", "does-not-exist"]) {
      await page.goto(`${DATA_ROOM}?project=${bad}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Data Room" })).toBeVisible({
        timeout: RENDER_TIMEOUT,
      });
      // Falls back to the first unlocked room rather than showing nothing.
      await expect(page.getByRole("heading", { name: "Solari Energy" })).toBeVisible();
    }
    expect(pageErrors, "bad ?project= caused a page error").toEqual([]);
  });
});

test.describe("B4 Stage 3 — Shortlist unlocks the Data Room", () => {
  test("a shortlisted card links to that project's own room", async ({ page }) => {
    await page.goto(CLUB_DEAL, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Club Deal Finder" })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });

    // Solari Storage sits in Shortlist, so its card carries the unlock link.
    const link = page.getByRole("link", { name: /Open Data Room/ }).first();
    await expect(link).toBeVisible();
    await link.click();

    await page.waitForURL(/data-room\?project=/, { timeout: RENDER_TIMEOUT });
    await expect(page.getByRole("heading", { name: "Data Room" })).toBeVisible();

    // The room that opens is that project's, not the default one.
    await expect(page.getByRole("heading", { name: "Solari Storage" })).toBeVisible();
    await expect(page.getByText("UL 1974 pre-certification test results")).toBeVisible();
  });

  test("Data Room access agrees with Club Deal Finder's stages", async ({ page }) => {
    // Both screens read INITIAL_DEAL_STAGES, so what is locked in one must be
    // watchlist in the other. Checked against the board rather than the fixture
    // so the two cannot drift apart unnoticed.
    await page.goto(CLUB_DEAL, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^Watchlist \(/ })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });
    const watchlistColumn = page
      .getByRole("heading", { name: /^Watchlist \(/ })
      .locator("xpath=ancestor::section[1]");
    const watchlistText = await watchlistColumn.innerText();

    await page.goto(DATA_ROOM, { waitUntil: "domcontentloaded" });
    const lockedLine = await page
      .getByText(/Locked, still on your watchlist/)
      .innerText({ timeout: RENDER_TIMEOUT });

    for (const name of ["Fernbase Studio", "Loopwell Clinics", "Northlight Robotics"]) {
      expect(watchlistText, `${name} on the Watchlist column`).toContain(name);
      expect(lockedLine, `${name} locked in the Data Room`).toContain(name);
    }
  });
});
