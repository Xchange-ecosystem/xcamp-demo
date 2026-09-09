// B4 Stage 1 live verification — fresh, unauthenticated browser context, full
// network logging on every new/changed screen.
//
// Two things this proves, which a source read cannot:
//   1. every route renders (no 404, no error boundary, no thrown render)
//   2. no screen reaches a backend — Supabase, the auth endpoints, or any
//      non-localhost origin at all
//
// Written for the B4 session's standing rule: live-verify unauthenticated with
// network logging before calling anything done.
import { expect, test, type Request } from "@playwright/test";

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

// The one legitimate off-app origin: the webfont <link> in index.html, which
// is app-wide chrome predating all of this and is a static asset CDN, not a
// backend. It is allowlisted by exact host rather than ignored, so a request
// to anywhere else still fails the screen.
const FONT_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

// Anything that is not the local dev server is a backend call we do not want.
// Vite's own HMR/module requests are all localhost, so this is a clean cut.
function isOffAppRequest(req: Request): boolean {
  const url = req.url();
  if (url.startsWith("data:") || url.startsWith("blob:")) return false;
  if (FONT_HOSTS.test(url)) return false;
  return !/^https?:\/\/(localhost|127\.0\.0\.1):5173\//.test(url);
}

// Separate, stricter net: the specific things this brief forbids. Kept apart
// from isOffAppRequest so a failure names what it caught. The dummy Supabase
// host from .env is included — a real call would resolve there and nowhere
// else, so this catches it even though the request would also fail on its own.
const BACKEND_PATTERNS =
  /supabase|demo-verification\.invalid|\/auth\/v1|\/rest\/v1|\/rpc\/|\/functions\/v1/i;

// Requests to the dev server itself are module loads, not backend traffic.
// Vite serves source by path, so /src/lib/supabase.ts and the
// @supabase_supabase-js dep bundle both come back as localhost GETs whose
// URLs contain "supabase" — they mean the module was imported, not that
// anything was queried. Excluding localhost here is what makes this check
// mean "talked to a backend" rather than "loaded a file with that name".
//
// The import itself is real and worth knowing about (DemoShell mounts
// ItemSidepanel, which statically imports @/lib/supabase, which is why the
// demo cannot boot without Supabase env vars) — but that is a bundling
// coupling, not a network call, and this assertion is about the latter.
function isBackendRequest(req: Request): boolean {
  const url = req.url();
  if (/^https?:\/\/(localhost|127\.0\.0\.1):5173\//.test(url)) return false;
  return BACKEND_PATTERNS.test(url);
}

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
      page.on("pageerror", (err) => pageErrors.push(String(err)));

      const response = await page.goto(screen.path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${screen.path} HTTP status`).toBeLessThan(400);

      await expect(
        page.getByText(screen.expect, { exact: false }).first(),
        `${screen.path} should render "${screen.expect}"`,
      ).toBeVisible();

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
    await page.waitForURL(/microapps\/portfolio/, { timeout: 15000 });
    expect(page.url()).toContain("/demo/investor/microapps/portfolio");
  });

  test("/demo/collaborator redirects to Assignments", async ({ page }) => {
    await page.goto("/demo/collaborator", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/microapps\/assignments/, { timeout: 15000 });
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
    await page.getByRole("button", { name: /Maren Solberg/ }).click();

    // UserProfileContent is the "user"-kind branch of ItemSidepanel.
    await expect(page.getByText("Viewing profile")).toBeVisible();
    await expect(page.getByText("Bio")).toBeVisible();

    await page.waitForTimeout(1200);
    expect(backend, "sidepanel user-kind reached a backend").toEqual([]);
    expect(offApp, "sidepanel user-kind made off-app requests").toEqual([]);
  });
});
