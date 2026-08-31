import { test, expect } from "@playwright/test";
import {
  installLiveHarness,
  PROJECT_ID,
  FAKE_TENANT_ID,
  FAKE_USER_ID,
} from "./helpers/liveAuth";

const SHOT_DIR = "test-results/punch-list";

function setPersona(persona: "founder" | "investor" | "collaborator") {
  return { name: "nox-founder-persona", value: JSON.stringify({ state: { persona }, version: 0 }) };
}

// installLiveHarness unconditionally seeds `xcamp-active-project` (it was built for
// project-scoped feature tests). Register an override init script AFTER it so tests
// that need the ecosystem-level (no active project) state actually get it — later
// addInitScript calls run after earlier ones on every navigation.
async function clearActiveProject(page: import("@playwright/test").Page) {
  await page.addInitScript(() => localStorage.removeItem("xcamp-active-project"));
}

test.describe("Doublecheck punch list — live verification", () => {
  test("Part C — ProjectEntryScreen redesign matches mockup text", async ({ page }) => {
    await installLiveHarness(page);
    await clearActiveProject(page);
    await page.goto("/home");
    await page.waitForSelector("text=I am ready. Are you?", { timeout: 15000 });

    await expect(page.getByText(/^(Good morning|Good afternoon|Good evening), Audit\.$/)).toBeVisible();
    await expect(page.getByText("I am your companion, always at your service.")).toBeVisible();
    await expect(page.getByText("I am ready. Are you?")).toBeVisible();
    await expect(page.getByText("Tap a project to get started")).toBeVisible();
    await expect(page.getByText("Do you want to work with or invest into a startup?")).toBeVisible();
    await expect(page.getByText("Enter the ecosystem instead.")).toBeVisible();
    // No chat UI on this screen
    await expect(page.locator("textarea")).toHaveCount(0);

    await page.screenshot({ path: `${SHOT_DIR}/part-c-entry-screen.png`, fullPage: true });
  });

  // AppShell's transparent variant (used by /home) defaults to a collapsed sidebar
  // unless this key says otherwise — force it open so nav-item text is visible.
  async function expandSidebar(page: import("@playwright/test").Page) {
    await page.addInitScript(() => localStorage.setItem("nox-founder-sidebar-collapsed", "false"));
  }

  test("Part A2 — role rail shows Investor/ Operator", async ({ page }) => {
    await installLiveHarness(page); // default harness state (active project) keeps CompanionRail clear of the entry-screen overlay
    await page.goto("/home");
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="rail-tab-role"]').click();
    await page.waitForSelector("text=Investor/ Operator", { timeout: 10000 });
    await expect(page.getByText("Investor/ Operator")).toBeVisible();
    await expect(page.getByText("Investor", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${SHOT_DIR}/part-a2-role-panel.png`, fullPage: true });
  });

  test("Part E — Project nav shows Goals (not My Goals)", async ({ page }) => {
    await installLiveHarness(page); // default harness state already has an active project
    await expandSidebar(page);
    await page.goto("/home");
    await page.waitForTimeout(1500);
    await expect(page.getByText("Goals", { exact: true })).toBeVisible();
    await expect(page.getByText("My Goals")).toHaveCount(0);
    await page.screenshot({ path: `${SHOT_DIR}/part-e-goals-label.png`, fullPage: true });
  });

  test("Part F — investor nav has bar-chart Dashboard icon and Navigator", async ({ page }) => {
    await installLiveHarness(page); // default harness state already has an active project — skips the entry screen entirely
    await expandSidebar(page);
    const p = setPersona("investor");
    await page.addInitScript((persona) => {
      localStorage.setItem(persona.name, persona.value);
    }, p);
    await page.goto("/home");
    await page.waitForTimeout(1500);
    // Land in Project scope by default (active project set) — switch to Ecosystem
    // scope via the sidebar's own segmented control, same as a real user would.
    await page.getByRole("button", { name: "Ecosystem", exact: false }).first().click();
    await page.waitForTimeout(1000);
    // First ecosystem visit this session triggers a pre-existing, unrelated first-launch
    // intro curtain (EcoIntroOverlay) that covers the sidebar — dismiss it for the screenshot.
    const introOrb = page.getByText("Welcome").first();
    if (await introOrb.isVisible().catch(() => false)) {
      await page.mouse.click(640, 150);
      await page.waitForTimeout(1000);
    }

    await expect(page.getByText("Ecosystem Navigator")).toBeVisible();
    await expect(page.getByText("Dashboard", { exact: true })).toBeVisible();
    await expect(page.getByText("Portfolio", { exact: true })).toBeVisible();
    // Founder-only items should be gone for investor
    await expect(page.getByText("Project Builder")).toHaveCount(0);
    await page.screenshot({ path: `${SHOT_DIR}/part-f-investor-nav.png`, fullPage: true });
  });

  test("Part D — Ecosystem Navigator tile grid + sidepanel click-through", async ({ page }) => {
    await installLiveHarness(page);
    await clearActiveProject(page);
    // Richer central_users + object_memberships stub for this test only —
    // last-registered route wins in Playwright, so this overrides the base harness.
    await page.route("**/rest/v1/central_users*", (route) => {
      const wantsSingle = (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
      const users = [
        { id: FAKE_USER_ID, tenant_id: FAKE_TENANT_ID, display_name: "Audit User", email: "a@x.co", preferences: {} },
        { id: "00000000-0000-4000-8000-000000000099", tenant_id: FAKE_TENANT_ID, display_name: "Jamie Founder", email: "j@x.co", preferences: {} },
      ];
      const body = wantsSingle ? users[0] : users;
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-1/2" }, body: JSON.stringify(body) });
    });
    await page.route("**/rest/v1/object_memberships*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "0-0/1" },
        body: JSON.stringify([{ user_central_id: FAKE_USER_ID, object_type: "project" }]),
      }),
    );

    await page.goto("/ecosystem-navigator");
    await page.waitForSelector("text=Ecosystem Navigator", { timeout: 15000 });
    await expect(page.getByText("Jamie Founder")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SHOT_DIR}/part-d-navigator-grid.png`, fullPage: true });

    await page.getByText("Jamie Founder").click();
    await page.waitForSelector("text=Viewing profile", { timeout: 10000 });
    await expect(page.getByText("Bio", { exact: true })).toBeVisible();
    await expect(page.getByText("No bio yet.")).toBeVisible();
    await page.screenshot({ path: `${SHOT_DIR}/part-d-navigator-panel.png`, fullPage: true });
  });

  test("Part B — new chat scoped per project, preserved on return, ecosystem unaffected", async ({ page }) => {
    await installLiveHarness(page);
    // Override the harness's default active-project seeding with one driven by
    // `window.name`, which (unlike localStorage writes made via evaluate()) survives
    // same-tab reloads and lets us flip ecosystem/project scope per step below —
    // registered after installLiveHarness so it runs after (and wins over) it.
    await page.addInitScript(() => {
      if (window.name === "eco") localStorage.removeItem("xcamp-active-project");
      else if (window.name) localStorage.setItem("xcamp-active-project", window.name);
    });

    // The base harness's jarvix_conversations stub is stateless (always returns []),
    // which can't tell "already visited" apart from "brand new" — needed to prove B2/B3
    // for real. Give it real create/query/close state for this test, keyed on project_id.
    const conversations: Array<{ id: string; project_id: string | null; status: string; created_at: string }> = [];
    await page.route("**/rest/v1/jarvix_conversations*", async (route) => {
      const req = route.request();
      if (req.method() === "POST") {
        const body = req.postDataJSON() as { id: string; project_id?: string | null };
        conversations.push({
          id: body.id,
          project_id: body.project_id ?? null,
          status: "active",
          created_at: new Date().toISOString(),
        });
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([body]) });
      }
      if (req.method() === "PATCH") {
        const url = new URL(req.url());
        const idFilter = url.searchParams.get("id") ?? "";
        const id = idFilter.replace("eq.", "");
        const conv = conversations.find((c) => c.id === id);
        if (conv) conv.status = "closed";
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
      // GET — filter by project_id like the real query does (`.eq`/`.is`)
      const url = new URL(req.url());
      const projectIdFilter = url.searchParams.get("project_id");
      let results = conversations.filter((c) => c.status !== "closed");
      if (projectIdFilter === "is.null") results = results.filter((c) => c.project_id === null);
      else if (projectIdFilter?.startsWith("eq.")) {
        const pid = projectIdFilter.slice(3);
        results = results.filter((c) => c.project_id === pid);
      }
      results.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": `0-${results.length}/${results.length}` },
        body: JSON.stringify(results.slice(0, 1)),
      });
    });

    const convRequests: { method: string; url: string; body: unknown }[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/rest/v1/jarvix_conversations")) {
        convRequests.push({ method: req.method(), url: req.url(), body: req.method() === "POST" ? req.postDataJSON() : null });
      }
    });

    // Initial load so we have a document to call window.name on.
    await page.goto("/home");
    await page.waitForTimeout(500);

    // 1) First visit — ecosystem scope (no active project)
    await page.evaluate(() => { window.name = "eco"; });
    convRequests.length = 0;
    await page.reload();
    await page.waitForTimeout(1500);
    const ecoFirstCreates = convRequests.filter((r) => r.method === "POST");
    expect(ecoFirstCreates.length).toBeGreaterThanOrEqual(1);
    expect(ecoFirstCreates[0].body).toMatchObject({ project_id: null });

    // 2) First visit — project scope
    await page.evaluate((pid) => { window.name = pid; }, PROJECT_ID);
    convRequests.length = 0;
    await page.reload();
    await page.waitForTimeout(1500);
    const projFirstCreates = convRequests.filter((r) => r.method === "POST");
    expect(projFirstCreates.length).toBeGreaterThanOrEqual(1);
    expect(projFirstCreates[0].body).toMatchObject({ project_id: PROJECT_ID });

    // 3) Return to ecosystem — should NOT create a new conversation; should query
    //    for the existing project_id IS NULL conversation instead.
    await page.evaluate(() => { window.name = "eco"; });
    convRequests.length = 0;
    await page.reload();
    await page.waitForTimeout(1500);
    const ecoReturnCreates = convRequests.filter((r) => r.method === "POST");
    const ecoReturnQueries = convRequests.filter((r) => r.method === "GET" && r.url.includes("project_id=is.null"));
    expect(ecoReturnCreates.length).toBe(0);
    expect(ecoReturnQueries.length).toBeGreaterThanOrEqual(1);

    // 4) Return to the same project — should NOT create a new conversation; should
    //    query for the existing project-scoped conversation instead.
    await page.evaluate((pid) => { window.name = pid; }, PROJECT_ID);
    convRequests.length = 0;
    await page.reload();
    await page.waitForTimeout(1500);
    const projReturnCreates = convRequests.filter((r) => r.method === "POST");
    const projReturnQueries = convRequests.filter(
      (r) => r.method === "GET" && r.url.includes(`project_id=eq.${PROJECT_ID}`),
    );
    expect(projReturnCreates.length).toBe(0);
    expect(projReturnQueries.length).toBeGreaterThanOrEqual(1);
  });
});
