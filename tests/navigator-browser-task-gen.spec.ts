/**
 * E2E: Navigator Browser — tasks_generation_status placeholder
 *
 * Tests the three UI states for an objective's task area:
 *   1. 'generating' with no tasks → Sparkles + "Generating tasks…" placeholder
 *   2. 'done' with tasks         → task list renders normally
 *   3. 'failed' with no tasks    → "No tasks yet." (graceful, no crash)
 *   4. Poll transition           → placeholder auto-hides when status flips to 'done'
 *
 * Connection strategy (same as navigator-graph.spec.ts):
 *   - Auth:     injected into localStorage via addInitScript
 *   - Supabase: mocked via page.route() — browser can't reach Supabase directly
 *
 * Backend note: these tests cover the FRONTEND half of the feature.
 * The backend async task materialization path (organiser/commit setting
 * 'generating', background upsert_objective_note, flip to 'done') requires
 * xcamp-backend PR#101 to be deployed before it can be tested end-to-end.
 */

import { test, expect, type Page } from "@playwright/test";

// ── Shared auth constants ─────────────────────────────────────────────────────

const ACCESS_TOKEN =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRkOWVlYWNlLWNlMzYtNDI0Yy04OTBiLWQwMTE5MjAyYzViOCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3VlZWJ6dWxleXJuc3J4Ym93ZGZhLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiNGM1ZDZlNy1mODkwLTRiY2QtOGVmMS0yMzQ1Njc4OTBhYmMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg0ODQxMzM1LCJpYXQiOjE3ODQ4Mzc3MzUsImVtYWlsIjoiY2MtdGVzdC1waGFzZTYxQHhjYW1wLmxvY2FsIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJmdWxsX25hbWUiOiJDQyBUZXN0IFBoYXNlIDYuMSIsInRlbmFudF9pZCI6IjMwYTAwZTYwLTdjYWUtNGE1ZS1hMzExLWIzYmU5OThlNzExMyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzgzODE5MDc2fV0sInNlc3Npb25faWQiOiIxYTIwNTNiMS0wOTY5LTQ5MDEtYTYxOS1mZDJkOTA3ZDlhYmQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.3guM4q4hX4qbMSzpdrA28cFse5xX_2RlUmtuYAyqrHIcopRqc6ge0A6o0yC2u9LJIA5Gf7AzofccqN0R9Y-F8w";
const REFRESH_TOKEN = "groe6dmql4qx";
const SUPABASE_PROJECT_REF = "ueebzuleyrnsrxbowdfa";
const LS_AUTH_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const TENANT_ID = "30a00e60-7cae-4a5e-a311-b3be998e7113";
const CENTRAL_USER_ID = "b4c5d6e7-f890-4bcd-8ef1-234567890abc";
const ACTIVE_PROJECT_LS_KEY = "xcamp-active-project";
const PROJECT_ID = "c5d6e7f8-90ab-4cde-bf12-34567890abcd";

// ── Test data ─────────────────────────────────────────────────────────────────

const OBJ_GENERATING = "gen-obj-0001-0000-0000-000000000001";
const OBJ_DONE = "gen-obj-0002-0000-0000-000000000002";
const OBJ_FAILED = "gen-obj-0003-0000-0000-000000000003";
const TASK_A = "task-note-0001-0000-0000-000000000001";

const MOCK_CENTRAL_USER = {
  id: CENTRAL_USER_ID,
  tenant_id: TENANT_ID,
  display_name: "CC Test Phase 6.1",
  email: "cc-test-phase61@xcamp.local",
  preferences: {},
};
const SUPABASE_SESSION = {
  access_token: ACCESS_TOKEN,
  token_type: "bearer",
  expires_in: 157680000,
  expires_at: 1942617600,
  refresh_token: REFRESH_TOKEN,
  user: {
    id: CENTRAL_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "cc-test-phase61@xcamp.local",
    email_confirmed_at: "2026-07-08T12:13:03.006423Z",
    phone: "",
    confirmed_at: "2026-07-08T12:13:03.006423Z",
    last_sign_in_at: "2026-07-12T01:17:56.218396Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "CC Test Phase 6.1", tenant_id: TENANT_ID },
    created_at: "2026-07-08T12:13:03.006423Z",
    updated_at: "2026-07-23T20:15:35.576754Z",
    is_anonymous: false,
  },
};

const MOCK_OBJECTIVES = [
  {
    id: OBJ_GENERATING,
    title: "Generating Obj",
    status: "inactive",
    project_id: PROJECT_ID,
    sort_order: 1,
    description: null,
    tasks_generation_status: "generating",
  },
  {
    id: OBJ_DONE,
    title: "Done Obj",
    status: "active",
    project_id: PROJECT_ID,
    sort_order: 2,
    description: null,
    tasks_generation_status: "done",
  },
  {
    id: OBJ_FAILED,
    title: "Failed Obj",
    status: "inactive",
    project_id: PROJECT_ID,
    sort_order: 3,
    description: null,
    tasks_generation_status: "failed",
  },
];

const MOCK_NOTES = [
  {
    id: TASK_A,
    title: "Existing task",
    note_type: "task",
    done: false,
    body_html: null,
    body_markdown: null,
    tags: [],
    detail: {},
    owner_central_id: CENTRAL_USER_ID,
    tenant_id: TENANT_ID,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  },
];

// ── Route setup ───────────────────────────────────────────────────────────────

type StatusByObjId = Record<string, string>;

async function setupRoutes(page: Page, opts: { statusByObjId?: StatusByObjId } = {}) {
  // Fonts — catch before proxy fails on them
  await page.route("**fonts.googleapis.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/css", body: "/* mocked */" }),
  );
  await page.route("**fonts.gstatic.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "font/woff2", body: "" }),
  );

  // ── Supabase routes — register catch-all FIRST (LIFO: specific routes below take priority) ──

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/**`, (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/token**`, (r) => {
    if (r.request().method() !== "POST") return r.continue();
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SUPABASE_SESSION, refresh_token: REFRESH_TOKEN }),
    });
  });

  // central_users uses .single() — return object, not array
  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/central_users**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CENTRAL_USER),
    }),
  );

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/projects**`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: PROJECT_ID, title: "Phase 6.1 Verification Project" }]),
    }),
  );

  // Objectives: distinguish list call vs. single-row status poll.
  // Poll is identified by "select=tasks_generation_status" (not a full column list).
  // Note: "id=eq." alone is NOT a reliable discriminant — "tenant_id=eq." also contains it.
  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/objectives**`, (r) => {
    const url = r.request().url();
    const isPoll = url.includes("select=tasks_generation_status") && opts.statusByObjId;
    if (isPoll) {
      // Status poll for a specific objective — find which obj is being polled
      const match = url.match(/[?&]id=eq\.([^&]+)/);
      const objId = match ? decodeURIComponent(match[1]) : "";
      const status = opts.statusByObjId![objId] ?? "done";
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ tasks_generation_status: status }]),
      });
    } else {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OBJECTIVES),
      });
    }
  });

  // objective_notes: filter by objective_id=eq. so only OBJ_DONE returns a link
  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/objective_notes**`, (r) => {
    const url = r.request().url();
    if (url.includes(`objective_id=eq.${OBJ_DONE}`)) {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ objective_id: OBJ_DONE, note_id: TASK_A }]),
      });
    } else if (url.includes(`objective_id=in.`)) {
      // listObjectivesWithCounts bulk count call — return one link for OBJ_DONE
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ objective_id: OBJ_DONE, note_id: TASK_A }]),
      });
    } else {
      r.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
  });

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/notes**`, (r) => {
    const url = r.request().url();
    if (url.includes(TASK_A)) {
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_NOTES) });
    } else {
      r.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
  });
}

async function injectSession(page: Page) {
  await page.addInitScript(
    ({
      authKey,
      session,
      projectKey,
      projectId,
    }: {
      authKey: string;
      session: typeof SUPABASE_SESSION;
      projectKey: string;
      projectId: string;
    }) => {
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

/** Click an objective row by its title span */
async function clickObjective(page: Page, title: string) {
  // Wait for the Objectives column to appear (proves auth resolved + data loaded)
  await page.locator('text="Unassigned"').waitFor({ state: "visible", timeout: 20_000 });
  // Objectives are divs with onClick, not buttons — target the title span
  await page.locator(`span:text-is("${title}")`).first().click({ timeout: 10_000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Navigator Browser — tasks_generation_status placeholder", () => {
  // 1. 'generating' with no tasks → Sparkles+pulse placeholder visible
  test("1 · generating objective shows 'Generating tasks…' placeholder", async ({ page }) => {
    await setupRoutes(page, {
      statusByObjId: { [OBJ_GENERATING]: "generating" },
    });
    await injectSession(page);
    await page.goto("/navigator");

    await clickObjective(page, "Generating Obj");

    await expect(page.getByText("Generating tasks…")).toBeVisible({ timeout: 10_000 });
    console.log("✓ 'Generating tasks…' placeholder visible");

    await expect(page.getByText("No tasks yet.")).not.toBeVisible();
    console.log("✓ 'No tasks yet.' correctly suppressed while generating");
  });

  // 2. 'done' objective with tasks → task list, no placeholder
  test("2 · done objective with tasks renders task list, no placeholder", async ({ page }) => {
    await setupRoutes(page, {
      statusByObjId: { [OBJ_DONE]: "done" },
    });
    await injectSession(page);
    await page.goto("/navigator");

    await clickObjective(page, "Done Obj");

    await expect(page.getByText("Existing task")).toBeVisible({ timeout: 10_000 });
    console.log("✓ Task title 'Existing task' visible");

    await expect(page.getByText("Generating tasks…")).not.toBeVisible();
    console.log("✓ No generating placeholder when status is 'done'");
  });

  // 3. 'failed' with no tasks → "No tasks yet." gracefully
  test("3 · failed objective shows 'No tasks yet.' gracefully", async ({ page }) => {
    await setupRoutes(page, {
      statusByObjId: { [OBJ_FAILED]: "failed" },
    });
    await injectSession(page);
    await page.goto("/navigator");

    await clickObjective(page, "Failed Obj");

    await expect(page.getByText("No tasks yet.")).toBeVisible({ timeout: 10_000 });
    console.log("✓ 'No tasks yet.' shown for failed objective");

    await expect(page.getByText("Generating tasks…")).not.toBeVisible();
    console.log("✓ No generating placeholder for failed state");
  });

  // 4. Poll transition: placeholder auto-hides once status flips to 'done'
  test("4 · placeholder auto-hides when status transitions generating → done", async ({ page }) => {
    let pollCount = 0;

    // Register catch-all FIRST (LIFO: specific handlers below take priority)
    await page.route("**fonts.googleapis.com/**", (r) =>
      r.fulfill({ status: 200, contentType: "text/css", body: "" }),
    );
    await page.route("**fonts.gstatic.com/**", (r) =>
      r.fulfill({ status: 200, contentType: "font/woff2", body: "" }),
    );
    await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/**`, (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/token**`, (r) => {
      if (r.request().method() !== "POST") return r.continue();
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...SUPABASE_SESSION, refresh_token: REFRESH_TOKEN }),
      });
    });
    // central_users uses .single() — return object, not array
    await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/central_users**`, (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CENTRAL_USER),
      }),
    );
    await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/projects**`, (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: PROJECT_ID, title: "Phase 6.1 Verification Project" }]),
      }),
    );
    await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/objective_notes**`, (r) => {
      const url = r.request().url();
      // After transition, tasks appear for OBJ_GENERATING
      const status = pollCount >= 2 ? "done" : "generating";
      if (url.includes(`objective_id=eq.${OBJ_GENERATING}`) && status === "done") {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ objective_id: OBJ_GENERATING, note_id: TASK_A }]),
        });
      } else {
        r.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
    });
    await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/notes**`, (r) => {
      const url = r.request().url();
      if (url.includes(TASK_A)) {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_NOTES),
        });
      } else {
        r.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
    });

    // Objectives route last (highest priority in LIFO): list returns MOCK_OBJECTIVES,
    // status poll returns 'generating' the first time and 'done' thereafter
    await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/objectives**`, (r) => {
      const url = r.request().url();
      if (url.includes("select=tasks_generation_status")) {
        pollCount++;
        const status = pollCount <= 1 ? "generating" : "done";
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ tasks_generation_status: status }]),
        });
      } else {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_OBJECTIVES),
        });
      }
    });

    await injectSession(page);
    await page.goto("/navigator");

    await clickObjective(page, "Generating Obj");

    // Initially generating → placeholder visible
    await expect(page.getByText("Generating tasks…")).toBeVisible({ timeout: 10_000 });
    console.log(`✓ Initial state (poll #${pollCount}): 'Generating tasks…' visible`);

    // After the 2s refetchInterval fires the second poll (→ 'done'), tasks appear
    await expect(page.getByText("Existing task")).toBeVisible({ timeout: 8_000 });
    console.log(`✓ After poll transition (poll #${pollCount}): task 'Existing task' visible`);

    await expect(page.getByText("Generating tasks…")).not.toBeVisible();
    console.log("✓ Placeholder auto-hidden after status → 'done'");
  });
});
