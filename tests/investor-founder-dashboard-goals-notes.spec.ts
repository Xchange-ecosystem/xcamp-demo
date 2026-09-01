import { test, expect, type Page } from "@playwright/test";

const SUPABASE_PROJECT_REF = "ueebzuleyrnsrxbowdfa";
const LS_AUTH_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const ACTIVE_PROJECT_LS_KEY = "xcamp-active-project";
const TENANT_ID = "30a00e60-7cae-4a5e-a311-b3be998e7113";
const CENTRAL_USER_ID = "b4c5d6e7-f890-4bcd-8ef1-234567890abc";
const PROJECT_ID = "c5d6e7f8-90ab-4cde-bf12-34567890abcd";
const OBJ_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const TASK_ID = "bbbbbbbb-0000-0000-0000-000000000001";
const NOTE_ID = "cccccccc-0000-0000-0000-000000000001";

const SUPABASE_SESSION = {
  access_token: "fake-access-token",
  token_type: "bearer",
  expires_in: 157680000,
  expires_at: 1942617600,
  refresh_token: "fake-refresh-token",
  user: {
    id: CENTRAL_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "repro@xcamp.local",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Repro User", tenant_id: TENANT_ID },
    created_at: "2026-01-01T00:00:00Z",
    is_anonymous: false,
  },
};

const MOCK_CENTRAL_USER = {
  id: CENTRAL_USER_ID, tenant_id: TENANT_ID,
  display_name: "Repro User", email: "repro@xcamp.local", preferences: {},
};

const MOCK_OBJECTIVES = [
  { id: OBJ_ID, title: "Compliance objective", status: "active", project_id: PROJECT_ID, sort_order: 1, description: "seeded", tasks_generation_status: "done" },
];

const MOCK_TASK = {
  id: TASK_ID, title: "File the Q3 filing", note_type: "task", done: false,
  body_html: "<p>seeded</p>", body_markdown: "seeded", tags: [], detail: {},
  owner_central_id: CENTRAL_USER_ID, tenant_id: TENANT_ID,
  created_at: "2026-07-01T00:00:00Z", updated_at: "2026-07-01T00:00:00Z",
};

// A plain note linked to the project ONLY via objective_notes -> objectives.project_id
// (no notes.detail.project_id set) — the exact shape the My Notes filter bug missed.
const MOCK_NOTE = {
  id: NOTE_ID, title: "Vymo WBS kickoff note", note_type: "note", done: false,
  body_html: "<p>seeded note</p>", body_markdown: "seeded note", tags: [], detail: {},
  owner_central_id: CENTRAL_USER_ID, tenant_id: TENANT_ID,
  created_at: "2026-07-02T00:00:00Z", updated_at: "2026-07-02T00:00:00Z",
};

async function setupRoutes(page: Page) {
  await page.route("**fonts.googleapis.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/css", body: "/* mocked */" }));
  await page.route("**fonts.gstatic.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "font/woff2", body: "" }));

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/**`, (r) =>
    r.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }));

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/**`, (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SUPABASE_SESSION) }));

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/central_users**`, (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CENTRAL_USER) }));

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/projects**`, (r) => {
    const wantsSingle = (r.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    const row = { id: PROJECT_ID, title: "Vymo Project WBS Generation", description: "seeded", tags: [] };
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsSingle ? row : [row]) });
  });

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/objectives**`, (r) => {
    const url = r.request().url();
    if (url.includes("select=tasks_generation_status")) {
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ tasks_generation_status: "done" }]) });
    } else if (url.includes(`id=in.`) || url.includes(`id=eq.${OBJ_ID}`) || !url.includes("select=")) {
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_OBJECTIVES) });
    } else {
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_OBJECTIVES) });
    }
  });

  // objective_notes: both the task and the plain note are linked to the one
  // objective under this project — this is the ONLY thing that associates
  // either of them with PROJECT_ID (no direct project_id column on notes).
  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/objective_notes**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { objective_id: OBJ_ID, note_id: TASK_ID },
        { objective_id: OBJ_ID, note_id: NOTE_ID },
      ]),
    }));

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/notes**`, (r) => {
    const url = r.request().url();
    const wantsSingle = (r.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    if (url.includes(TASK_ID)) {
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsSingle ? MOCK_TASK : [MOCK_TASK]) });
    } else if (url.includes(NOTE_ID)) {
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsSingle ? MOCK_NOTE : [MOCK_NOTE]) });
    } else if (!url.includes("owner_central_id")) {
      r.fulfill({ status: 200, contentType: "application/json", body: wantsSingle ? "{}" : "[]" });
    } else {
      // listNotes() — the full owned-notes list backing the My Notes page.
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_TASK, MOCK_NOTE]) });
    }
  });
}

async function injectSession(page: Page, persona?: "founder" | "investor") {
  await page.addInitScript(
    ({ authKey, session, projectKey, projectId, personaValue }) => {
      localStorage.setItem(authKey, JSON.stringify(session));
      localStorage.setItem(projectKey, projectId);
      if (personaValue) {
        localStorage.setItem(
          "nox-founder-persona",
          JSON.stringify({ state: { persona: personaValue }, version: 0 }),
        );
      }
    },
    { authKey: LS_AUTH_KEY, session: SUPABASE_SESSION, projectKey: ACTIVE_PROJECT_LS_KEY, projectId: PROJECT_ID, personaValue: persona },
  );
}

test.describe("Investor/Founder dashboard split + Goals input + My Notes filter", () => {
  test("founder sees Overview + Dashboard tabs and can switch", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page, "founder");
    await page.goto(`/project/${PROJECT_ID}`);
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByPlaceholder("Project title")).toBeVisible();

    await page.getByRole("button", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/tab=dashboard/);
    await expect(page.getByText("No daily snapshots recorded for this project yet.")).toBeVisible();
    await page.screenshot({ path: "test-results/investor-founder/founder-dashboard-tab.png", fullPage: true });
  });

  test("investor sees Dashboard only — no tab switcher, no Overview reachable", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page, "investor");
    await page.goto(`/project/${PROJECT_ID}`);
    await expect(page.getByText("No daily snapshots recorded for this project yet.")).toBeVisible({ timeout: 15_000 });

    // No tab switcher at all — scope to <main> so the sidebar's own (investor-only,
    // ecosystem-scoped) "Dashboard" nav item doesn't confuse the assertion.
    const main = page.locator("main");
    await expect(main.getByRole("button", { name: "Overview", exact: true })).toHaveCount(0);
    await expect(main.getByRole("button", { name: "Dashboard", exact: true })).toHaveCount(0);
    // Overview-only content (editable title input) must not render either.
    await expect(page.getByPlaceholder("Project title")).toHaveCount(0);
    await page.screenshot({ path: "test-results/investor-founder/investor-dashboard-only.png", fullPage: true });

    // Even a stale/typed ?tab=overview link gets corrected, not honored.
    await page.goto(`/project/${PROJECT_ID}?tab=overview`);
    await expect(page.getByText("No daily snapshots recorded for this project yet.")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/tab=dashboard/);
    await expect(page.getByPlaceholder("Project title")).toHaveCount(0);
  });

  test("founder Project Details nav opens the tabbed project page, not the flat page", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page, "founder");
    await page.goto("/home");
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: /Project Details/i }).click();
    await expect(page).toHaveURL(new RegExp(`/project/${PROJECT_ID}(\\?|$)`));
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await page.screenshot({ path: "test-results/investor-founder/project-details-nav.png", fullPage: true });
  });

  test("Goals page create-goal field is a multiline, ~4-row textarea", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page, "founder");
    await page.goto(`/project/${PROJECT_ID}/goals`);
    const field = page.getByPlaceholder('Create a new goal… e.g. "Launch our beta waitlist"');
    await expect(field).toBeVisible({ timeout: 15_000 });
    const tag = await field.evaluate((el) => el.tagName);
    expect(tag).toBe("TEXTAREA");
    const rows = await field.getAttribute("rows");
    expect(rows).toBe("4");
    await page.screenshot({ path: "test-results/investor-founder/goals-textarea.png", fullPage: true });
  });

  test("My Notes: project filter finds a note linked only via objective_notes", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page, "founder");
    await page.goto("/notes");
    // Default state: filterProject already = the active project (Vymo Project WBS
    // Generation), Type filter defaults to "note" — MOCK_NOTE has note_type "note"
    // and is linked to that project ONLY via objective_notes (no detail.project_id).
    // Before the fix this filter combo showed "No notes match your search or filters."
    await expect(page.getByText(`Project: Vymo Project WBS`, { exact: false })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(MOCK_NOTE.title)).toBeVisible();
    await expect(page.getByText("No notes match your search or filters")).toHaveCount(0);

    // Also enable the Task type pill and confirm the linked task resolves too.
    await page.getByRole("button", { name: "Filter notes" }).click();
    await page.getByRole("button", { name: "Task", exact: true }).click();
    await expect(page.getByText(MOCK_TASK.title)).toBeVisible();
    await page.screenshot({ path: "test-results/investor-founder/my-notes-filter-fixed.png", fullPage: true });
  });
});
