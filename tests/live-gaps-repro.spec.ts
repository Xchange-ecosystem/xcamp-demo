import { test, expect, type Page } from "@playwright/test";

const SUPABASE_PROJECT_REF = "ueebzuleyrnsrxbowdfa";
const LS_AUTH_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const ACTIVE_PROJECT_LS_KEY = "xcamp-active-project";
const TENANT_ID = "30a00e60-7cae-4a5e-a311-b3be998e7113";
const CENTRAL_USER_ID = "b4c5d6e7-f890-4bcd-8ef1-234567890abc";
const PROJECT_ID = "c5d6e7f8-90ab-4cde-bf12-34567890abcd";
const OBJ_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const TASK_ID = "bbbbbbbb-0000-0000-0000-000000000001";

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
  id: CENTRAL_USER_ID,
  tenant_id: TENANT_ID,
  display_name: "Repro User",
  email: "repro@xcamp.local",
  preferences: {},
};

const MOCK_OBJECTIVES = [
  {
    id: OBJ_ID,
    title: "Compliance & Regulatory Framework",
    status: "active",
    project_id: PROJECT_ID,
    sort_order: 1,
    description: "seeded",
    tasks_generation_status: "done",
  },
];

const MOCK_TASK = {
  id: TASK_ID,
  title: "File the Q3 filing",
  note_type: "task",
  done: false,
  body_html: "<p>Some task detail</p>",
  body_markdown: "Some task detail",
  tags: ["compliance"],
  detail: {},
  owner_central_id: CENTRAL_USER_ID,
  tenant_id: TENANT_ID,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

async function setupRoutes(page: Page) {
  await page.route("**fonts.googleapis.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/css", body: "/* mocked */" }),
  );
  await page.route("**fonts.gstatic.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "font/woff2", body: "" }),
  );

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-0/0" },
      body: "[]",
    }),
  );

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SUPABASE_SESSION),
    }),
  );

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/central_users**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CENTRAL_USER),
    }),
  );

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/projects**`, (r) => {
    const wantsSingle = (r.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    const row = { id: PROJECT_ID, title: "Repro Project", description: "seeded", tags: [] };
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(wantsSingle ? row : [row]),
    });
  });

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/objectives**`, (r) => {
    const url = r.request().url();
    if (url.includes("select=tasks_generation_status")) {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ tasks_generation_status: "done" }]),
      });
    } else {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OBJECTIVES),
      });
    }
  });

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/objective_notes**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ objective_id: OBJ_ID, note_id: TASK_ID }]),
    }),
  );

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/notes**`, (r) => {
    const url = r.request().url();
    const wantsSingle = (r.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    if (url.includes(TASK_ID)) {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(wantsSingle ? MOCK_TASK : [MOCK_TASK]),
      });
    } else {
      r.fulfill({ status: 200, contentType: "application/json", body: wantsSingle ? "{}" : "[]" });
    }
  });
}

async function injectSession(page: Page) {
  await page.addInitScript(
    ({ authKey, session, projectKey, projectId }) => {
      localStorage.setItem(authKey, JSON.stringify(session));
      localStorage.setItem(projectKey, projectId);
    },
    {
      authKey: LS_AUTH_KEY,
      session: SUPABASE_SESSION,
      projectKey: ACTIVE_PROJECT_LS_KEY,
      projectId: PROJECT_ID,
    },
  );
}

test.describe("Live production gaps — repro", () => {
  // Issue 2 — objective sidepanel must show Metrics AND AI summary, and the
  // latter must be visible without scrolling past the (often empty) Description editor.
  test("objective sidepanel — Metrics + AI summary", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page);
    await page.goto("/navigator");
    await page
      .locator(`span:text-is("${MOCK_OBJECTIVES[0].title}")`)
      .first()
      .waitFor({ timeout: 20_000 });
    await page.getByRole("button", { name: "Open" }).first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "test-results/live-gaps/objective-panel.png", fullPage: true });

    const metrics = page.getByText("Metrics", { exact: true });
    const aiSummary = page.getByText("AI summary", { exact: true });
    await expect(metrics).toBeVisible();
    await expect(aiSummary).toBeVisible();
    // AI summary must render above the Description editor, not below it.
    const metricsBox = await metrics.boundingBox();
    const summaryBox = await aiSummary.boundingBox();
    const descriptionLabel = await page.getByText("Description", { exact: true }).boundingBox();
    expect(summaryBox!.y).toBeGreaterThan(metricsBox!.y);
    expect(summaryBox!.y).toBeLessThan(descriptionLabel!.y);
  });

  // Issue 1 — task content tab must keep title + accordion, and only swap the
  // body editor for the AI summary (not the whole panel).
  test("task sidepanel — content tab composition", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page);
    await page.goto("/navigator");
    await page
      .locator(`span:text-is("${MOCK_OBJECTIVES[0].title}")`)
      .first()
      .waitFor({ timeout: 20_000 });
    await page.locator(`span:text-is("${MOCK_OBJECTIVES[0].title}")`).first().click();
    await page.waitForTimeout(800);
    await page.locator(`text="${MOCK_TASK.title}"`).first().click({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "test-results/live-gaps/task-panel.png", fullPage: true });

    // Title field, still present and editable, prefilled with the task's title.
    await expect(page.getByPlaceholder("Note title")).toHaveValue(MOCK_TASK.title);
    // Meta accordion toggle, still present (shows note type + tag count).
    await expect(page.getByText("Task · 1 tag")).toBeVisible();
    // Body editor replaced by the AI summary — no rich-text toolbar for this note.
    await expect(page.getByText("AI summary", { exact: true })).toBeVisible();
    await expect(page.locator(".tiptap, [contenteditable]")).toHaveCount(0);
  });

  test("project page — Dashboard tab reachable and renders", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page);
    await page.goto(`/project/${PROJECT_ID}`);
    await page.getByRole("button", { name: "Overview" }).waitFor({ timeout: 15_000 });
    await page.getByRole("button", { name: "Dashboard" }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "test-results/live-gaps/dashboard-tab.png", fullPage: true });
    await expect(page).toHaveURL(/tab=dashboard/);
    await expect(page.getByText("Objectives", { exact: true })).toBeVisible();
    await expect(page.getByText("No daily snapshots recorded for this project yet.")).toBeVisible();
  });

  test("stray /project-dashboard route redirects to the real Dashboard tab", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page);
    await page.goto(`/project/${PROJECT_ID}/project-dashboard`);
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(new RegExp(`/project/${PROJECT_ID}\\?tab=dashboard`));
    await expect(page.getByText("Project analytics and reporting")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("No daily snapshots recorded for this project yet.")).toBeVisible();
  });
});
