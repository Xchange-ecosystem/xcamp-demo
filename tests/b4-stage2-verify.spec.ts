// B4 Stage 2 live verification — Club Deal Finder, Due Diligence, and the
// regression surface the stage touched.
//
// Two things beyond "does it render", both of which a source read cannot
// settle: the interactive affordances actually work (stage movement, request
// info, expanding the trust card), and the screens that consume the *shared*
// fixtures and the newly-extracted NavigatorBoard still behave. Stage 2 edited
// OBJECTIVES (added hasExternalAssessor), TASKS (added eight contributor rows),
// and moved both Navigator screens onto a shared shell — all three reach
// Founder screens this brief never set out to change.
import { expect, test } from "@playwright/test";
import { RENDER_TIMEOUT, isBackendRequest, isOffAppRequest, isRealPageError } from "./net-guards";

const CLUB_DEAL = "/demo/investor/microapps/club-deal-finder";
const DUE_DILIGENCE = "/demo/investor/microapps/due-diligence";

test.describe("B4 Stage 2 — Club Deal Finder", () => {
  test("renders four stages with hints and watch counts", async ({ page }, testInfo) => {
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

    await page.goto(CLUB_DEAL, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Club Deal Finder" })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });

    for (const stage of ["Watchlist", "Shortlist", "Deciding", "Committed"]) {
      await expect(
        page.getByRole("heading", { name: new RegExp(`^${stage} \\(`) }),
        `${stage} column header`,
      ).toBeVisible();
    }

    // Stage hints — the relationship each column represents.
    await expect(page.getByText("Passive observation", { exact: false })).toBeVisible();
    await expect(page.getByText("Unlocks the project's Data Room")).toBeVisible();
    await expect(page.getByText("Under contract", { exact: false })).toBeVisible();

    // Watch-count badges are fixture data, one per card.
    const watching = page.getByText(/^\d+ watching$/);
    expect(await watching.count(), "watch-count badges").toBeGreaterThan(0);

    await page.screenshot({ path: testInfo.outputPath("club-deal-finder.png"), fullPage: true });
    await testInfo.attach("club-deal-finder", {
      path: testInfo.outputPath("club-deal-finder.png"),
      contentType: "image/png",
    });

    await page.waitForTimeout(1200);
    expect(backend, "club deal finder reached a backend").toEqual([]);
    expect(offApp, "club deal finder made off-app requests").toEqual([]);
    expect(pageErrors, "club deal finder console errors").toEqual([]);
  });

  test("Committed column reads sober — no accent, no motion", async ({ page }) => {
    await page.goto(CLUB_DEAL, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^Committed \(/ })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });

    // The gravity register: a committed card states the binding relationship
    // and carries no transition.
    const bindingNotes = page.getByText("Terms signed. Binding.");
    expect(await bindingNotes.count(), "binding notes on committed cards").toBeGreaterThan(0);

    const cardTransition = await bindingNotes
      .first()
      .locator("xpath=ancestor::div[contains(@style,'border-radius')][1]")
      .evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(cardTransition, "committed cards must not animate").toBe("none");
  });

  test("moving a card between stages is local and reversible", async ({ page }) => {
    await page.goto(CLUB_DEAL, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Club Deal Finder" })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });

    const watchlistCount = async () =>
      Number(
        (await page.getByRole("heading", { name: /^Watchlist \(/ }).innerText()).match(
          /\((\d+)\)/,
        )![1],
      );

    const before = await watchlistCount();
    await page.getByRole("button", { name: /Move Fernbase Studio forward a stage/ }).click();
    expect(await watchlistCount(), "card left Watchlist").toBe(before - 1);

    // ...and back, proving it is plain local state in both directions.
    await page.getByRole("button", { name: /Move Fernbase Studio back a stage/ }).click();
    expect(await watchlistCount(), "card returned to Watchlist").toBe(before);
  });

  test("Deciding stage offers request-info, with no backend call", async ({ page }) => {
    const backend: string[] = [];
    page.on("request", (req) => {
      if (isBackendRequest(req)) backend.push(req.url());
    });

    await page.goto(CLUB_DEAL, { waitUntil: "domcontentloaded" });
    const request = page.getByRole("button", { name: "Request more info" }).first();
    await expect(request).toBeVisible({ timeout: RENDER_TIMEOUT });
    await request.click();

    await expect(page.getByRole("button", { name: "Info requested" }).first()).toBeVisible();
    await page.waitForTimeout(1200);
    expect(backend, "request info must not call anything").toEqual([]);
  });
});

test.describe("B4 Stage 2 — Due Diligence", () => {
  test("trust card shows the four spec fields, expanding opens the stage", async ({
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

    await page.goto(DUE_DILIGENCE, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Due Diligence" })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });

    // Subject is the consistent demo project.
    await expect(page.getByRole("heading", { name: "Solari Energy" })).toBeVisible();

    // The four trust-card fields named in the spec excerpt.
    for (const field of ["Proof filed", "Evaluation", "Four-eyes", "Settled value"]) {
      await expect(page.getByText(field, { exact: true }), `${field} tile`).toBeVisible();
    }

    // Collapsed: the generated stage is not present yet.
    await expect(page.getByRole("heading", { name: "Decision timeline" })).toBeHidden();

    await page.getByRole("button", { name: /Open due-diligence stage/ }).click();

    // Expanded: three generated panels, no edit tools.
    await expect(page.getByRole("heading", { name: "Decision timeline" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Who contributed what" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quality trend" })).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath("due-diligence.png"), fullPage: true });
    await testInfo.attach("due-diligence", {
      path: testInfo.outputPath("due-diligence.png"),
      contentType: "image/png",
    });

    await page.waitForTimeout(1200);
    expect(backend, "due diligence reached a backend").toEqual([]);
    expect(offApp, "due diligence made off-app requests").toEqual([]);
    expect(pageErrors, "due diligence console errors").toEqual([]);
  });

  test("shows real Solari fixture data, not placeholders", async ({ page }) => {
    await page.goto(DUE_DILIGENCE, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Due Diligence" })).toBeVisible({
      timeout: RENDER_TIMEOUT,
    });
    await page.getByRole("button", { name: /Open due-diligence stage/ }).click();

    // Real objective titles from obj-17..21, in completion order.
    await expect(page.getByText("Validate demand across three rural counties")).toBeVisible();
    await expect(page.getByText("Secure ISO 9001 manufacturing partner")).toBeVisible();

    // The credibility badge distinguishes signed-off from self-attested, which
    // is the whole point of the field — both must appear.
    expect(await page.getByText("Four-eyes", { exact: true }).count()).toBeGreaterThan(1);
    expect(await page.getByText("Self-attested").count()).toBeGreaterThan(0);

    // Contributors come from the task rows added for those objectives.
    await expect(page.getByText("Kwame Boateng")).toBeVisible();
    await expect(page.getByText("Yuki Tanaka")).toBeVisible();

    // Quality trend is a real chart with the endpoint values labelled.
    await expect(page.locator("svg[role='img']")).toBeVisible();
    await expect(page.getByText("91%", { exact: true }).first()).toBeVisible();
  });
});

test.describe("B4 Stage 2 — regressions from shared changes", () => {
  // NavigatorBoard was extracted out of the Founder Navigator; the Founder
  // screens also read the OBJECTIVES/TASKS fixtures Stage 2 edited.
  const REGRESSION_SCREENS = [
    { path: "/demo/founder/navigator", name: "founder-navigator", expect: "Suggested" },
    { path: "/demo/founder/dashboard", name: "founder-dashboard", expect: "Tasks completed" },
    { path: "/demo/investor/navigator", name: "investor-navigator-badges", expect: "Four-eyes" },
    { path: "/demo/collaborator/microapps/assignments", name: "assignments", expect: "My wallet" },
  ];

  for (const screen of REGRESSION_SCREENS) {
    test(`${screen.name} still renders after the shared changes`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => {
        if (isRealPageError(err)) pageErrors.push(String(err));
      });

      await page.goto(screen.path, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(screen.expect, { exact: false }).first()).toBeVisible({
        timeout: RENDER_TIMEOUT,
      });
      expect(pageErrors, `${screen.path} console errors`).toEqual([]);
    });
  }

  test("Founder Navigator still shows all four lifecycle columns", async ({ page }) => {
    await page.goto("/demo/founder/navigator", { waitUntil: "domcontentloaded" });
    for (const col of ["Suggested", "Open", "In progress", "Done"]) {
      await expect(
        page.getByRole("heading", { name: new RegExp(`^${col} \\(`) }),
        `${col} column survived the NavigatorBoard extraction`,
      ).toBeVisible({ timeout: RENDER_TIMEOUT });
    }
  });
});
