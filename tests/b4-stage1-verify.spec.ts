// B4 Stage 1 live verification — fresh, unauthenticated browser context, full
// network logging on every new/changed screen.
//
// Two things this proves, which a source read cannot:
//   1. every route renders (no 404, no error boundary, no thrown render)
//   2. no screen reaches a backend
//
// Written for the B4 session's standing rule: live-verify unauthenticated with
// network logging before calling anything done. Guards live in ./net-guards so
// the Stage 2 spec asserts against exactly the same definitions.
import { expect, test } from "@playwright/test";
import { RENDER_TIMEOUT, isBackendRequest, isOffAppRequest, isRealPageError } from "./net-guards";

interface Screen {
  path: string;
  name: string;
  /** Text that must be on the page for it to count as rendered. */
  expect: string;
}

const SCREENS: Screen[] = [
  // Investor — top level
  { path: "/demo/investor", name: "investor-home", expect: "What moved this week" },
  { path: "/demo/investor/navigator", name: "investor-navigator", expect: "Navigator" },
  { path: "/demo/investor/dashboard", name: "investor-dashboard", expect: "By project" },
  // Investor — MicroApps
  {
    path: "/demo/investor/microapps/portfolio",
    name: "investor-portfolio",
    expect: "Projects",
  },
  {
    path: "/demo/investor/microapps/club-deal-finder",
    name: "investor-club-deal-finder",
    expect: "Club Deal Finder",
  },
  {
    path: "/demo/investor/microapps/due-diligence",
    name: "investor-due-diligence",
    expect: "Due Diligence",
  },
  {
    path: "/demo/investor/microapps/readiness",
    name: "investor-readiness",
    expect: "Readiness",
  },
  { path: "/demo/investor/microapps/data-room", name: "investor-data-room", expect: "Data Room" },
  {
    path: "/demo/investor/microapps/deal-flow",
    name: "investor-deal-flow",
    expect: "Deal-Flow & -Share",
  },
  { path: "/demo/investor/microapps/hot-stuff", name: "investor-hot-stuff", expect: "Hot Stuff" },
  {
    path: "/demo/investor/microapps/secondary-market",
    name: "investor-secondary-market",
    expect: "Secondary Market",
  },
  // Collaborator
  {
    path: "/demo/collaborator/microapps/assignments",
    name: "collaborator-assignments",
    expect: "My assignments",
  },
  {
    path: "/demo/collaborator/microapps/reward",
    name: "collaborator-reward",
    expect: "Reward Collaboration",
  },
  { path: "/demo/collaborator/microapps/peer", name: "collaborator-peer", expect: "Peer" },
  {
    path: "/demo/collaborator/microapps/knowledge",
    name: "collaborator-knowledge",
    expect: "Knowledge App",
  },
  // Founder — the six migrated placeholders
  { path: "/demo/founder/microapps/journal", name: "founder-journal", expect: "My Journal" },
  { path: "/demo/founder/microapps/notes", name: "founder-notes", expect: "My Notes" },
  { path: "/demo/founder/microapps/goals", name: "founder-goals", expect: "Goals" },
  { path: "/demo/founder/microapps/readiness", name: "founder-readiness", expect: "Readiness" },
  { path: "/demo/founder/microapps/evolution", name: "founder-evolution", expect: "Evolution" },
  {
    path: "/demo/founder/microapps/project-builder",
    name: "founder-project-builder",
    expect: "Project Builder",
  },
];

test.describe("B4 Stage 1 — unauthenticated render + zero backend", () => {
  for (const screen of SCREENS) {
    test(`${screen.name} renders with no off-app network`, async ({ page }, testInfo) => {
      const offApp: string[] = [];
      const backend: string[] = [];
      const pageErrors: string[] = [];

      page.on("request", (req) => {
        if (isBackendRequest(req)) backend.push(`${req.method()} ${req.url()}`);
        if (isOffAppRequest(req)) offApp.push(`${req.method()} ${req.url()}`);
      });
      page.on("pageerror", (err) => {
        if (isRealPageError(err)) pageErrors.push(String(err));
      });

      const response = await page.goto(screen.path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${screen.path} HTTP status`).toBeLessThan(400);

      await expect(
        page.getByText(screen.expect, { exact: false }).first(),
        `${screen.path} should render "${screen.expect}"`,
      ).toBeVisible({ timeout: RENDER_TIMEOUT });

      await page.screenshot({
        path: testInfo.outputPath(`${screen.name}.png`),
        fullPage: true,
      });
      await testInfo.attach(screen.name, {
        path: testInfo.outputPath(`${screen.name}.png`),
        contentType: "image/png",
      });

      // Give any deferred/lazy request a chance to fire before asserting.
      await page.waitForTimeout(1200);

      expect(backend, `${screen.path} reached a backend`).toEqual([]);
      expect(offApp, `${screen.path} made off-app requests`).toEqual([]);
      expect(pageErrors, `${screen.path} console errors`).toEqual([]);
    });
  }

  test("legacy /demo/investor/portfolio still resolves (main-app sidebar link)", async ({
    page,
  }) => {
    await page.goto("/demo/investor/portfolio", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/microapps\/portfolio/, { timeout: RENDER_TIMEOUT });
    expect(page.url()).toContain("/demo/investor/microapps/portfolio");
  });

  test("/demo/collaborator redirects to Assignments", async ({ page }) => {
    await page.goto("/demo/collaborator", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/microapps\/assignments/, { timeout: RENDER_TIMEOUT });
    expect(page.url()).toContain("/demo/collaborator/microapps/assignments");
  });

  test("Peer tile opens the user sidepanel with no backend call", async ({ page }) => {
    const offApp: string[] = [];
    const backend: string[] = [];
    page.on("request", (req) => {
      if (isBackendRequest(req)) backend.push(`${req.method()} ${req.url()}`);
      if (isOffAppRequest(req)) offApp.push(`${req.method()} ${req.url()}`);
    });

    await page.goto("/demo/collaborator/microapps/peer", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Maren Solberg/ }).click({ timeout: RENDER_TIMEOUT });

    // UserProfileContent is the "user"-kind branch of ItemSidepanel.
    await expect(page.getByText("Viewing profile")).toBeVisible({ timeout: RENDER_TIMEOUT });
    await expect(page.getByText("Bio")).toBeVisible();

    await page.waitForTimeout(1200);
    expect(backend, "sidepanel user-kind reached a backend").toEqual([]);
    expect(offApp, "sidepanel user-kind made off-app requests").toEqual([]);
  });
});
