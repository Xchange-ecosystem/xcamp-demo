/**
 * E2E: Navigator Network graph — verifies all 9 functional areas.
 *
 * Connection strategy (same as backcaster-e2e.spec.ts):
 *  - Auth: injected into localStorage via addInitScript (same test session)
 *  - Supabase REST: mocked via page.route() — browser can't reach Supabase
 *    directly through the env proxy
 *  - activeProjectId: injected into localStorage alongside auth
 *
 * Items verified:
 *  1. Graph renders — ReactFlow canvas, project node, 3 objective nodes, task nodes
 *  2. Click node → EntityPanel opens (Sheet dialog appears)
 *  3. "+" button → creates task + panel opens  (mocked POST, panel appears)
 *  4. Drag → localStorage position persistence
 *  5. "Arrange" button → positions key cleared from localStorage
 *  6. Zoom controls present and clickable
 *  7. MiniMap present
 *  8. Cross-objective edge drawing → migration toast appears
 *  9. Empty state when no project selected
 */

import { test, expect, type Page } from "@playwright/test";

// ── Auth constants (same user as backcaster-e2e.spec.ts) ─────────────────────

const ACCESS_TOKEN =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRkOWVlYWNlLWNlMzYtNDI0Yy04OTBiLWQwMTE5MjAyYzViOCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3VlZWJ6dWxleXJuc3J4Ym93ZGZhLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiNGM1ZDZlNy1mODkwLTRiY2QtOGVmMS0yMzQ1Njc4OTBhYmMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg0ODQxMzM1LCJpYXQiOjE3ODQ4Mzc3MzUsImVtYWlsIjoiY2MtdGVzdC1waGFzZTYxQHhjYW1wLmxvY2FsIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJmdWxsX25hbWUiOiJDQyBUZXN0IFBoYXNlIDYuMSIsInRlbmFudF9pZCI6IjMwYTAwZTYwLTdjYWUtNGE1ZS1hMzExLWIzYmU5OThlNzExMyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzgzODE5MDc2fV0sInNlc3Npb25faWQiOiIxYTIwNTNiMS0wOTY5LTQ5MDEtYTYxOS1mZDJkOTA3ZDlhYmQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.3guM4q4hX4qbMSzpdrA28cFse5xX_2RlUmtuYAyqrHIcopRqc6ge0A6o0yC2u9LJIA5Gf7AzofccqN0R9Y-F8w";

const REFRESH_TOKEN = "groe6dmql4qx";
const SUPABASE_PROJECT_REF = "ueebzuleyrnsrxbowdfa";
const LS_AUTH_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const TENANT_ID = "30a00e60-7cae-4a5e-a311-b3be998e7113";
const CENTRAL_USER_ID = "b4c5d6e7-f890-4bcd-8ef1-234567890abc";

// ── Test project & data (real IDs from DB, data mocked) ──────────────────────

const PROJECT_ID = "26c61da5-1b85-4180-b244-d6d5b0d59857";
const POSITIONS_LS_KEY = `xcamp-nav-graph:${PROJECT_ID}`;
const ACTIVE_PROJECT_LS_KEY = "xcamp-active-project";

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

const MOCK_PROJECT = { id: PROJECT_ID, title: "Mental Performance Optimization Platform" };

const OBJ_A = "a4ec34f7-00b4-46a7-b5ec-9634b1231e70";
const OBJ_B = "7e944950-90a7-4093-98cb-edabff82b519";
const OBJ_C = "4f877da8-7381-4d39-b412-947aecbbd96d";

const MOCK_OBJECTIVES = [
  {
    id: OBJ_A,
    title: "Business Strategy",
    status: "inactive",
    project_id: PROJECT_ID,
    sort_order: 1,
    description: null,
  },
  {
    id: OBJ_B,
    title: "Product Development",
    status: "active",
    project_id: PROJECT_ID,
    sort_order: 2,
    description: null,
  },
  {
    id: OBJ_C,
    title: "Market Strategy",
    status: "completed",
    project_id: PROJECT_ID,
    sort_order: 3,
    description: null,
  },
];

const TASK_1 = "task-note-0001";
const TASK_2 = "task-note-0002";
const NEW_TASK_ID = "task-note-new-999";

const MOCK_OBJ_NOTES = [
  { objective_id: OBJ_A, note_id: TASK_1 },
  { objective_id: OBJ_A, note_id: TASK_2 },
];

const MOCK_NOTES_BASE = [
  {
    id: TASK_1,
    title: "Research competitors",
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
  {
    id: TASK_2,
    title: "Define pricing model",
    note_type: "task",
    done: true,
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

const MOCK_NEW_NOTE = {
  id: NEW_TASK_ID,
  title: "",
  note_type: "task",
  done: false,
  body_html: null,
  body_markdown: null,
  tags: [],
  detail: {},
  owner_central_id: CENTRAL_USER_ID,
  tenant_id: TENANT_ID,
  created_at: "2026-07-25T00:00:00Z",
  updated_at: "2026-07-25T00:00:00Z",
};

// ── Route setup helper ────────────────────────────────────────────────────────

async function setupRoutes(page: Page, opts: { noteCreated?: boolean } = {}) {
  const notesPool = opts.noteCreated ? [...MOCK_NOTES_BASE, MOCK_NEW_NOTE] : MOCK_NOTES_BASE;

  // Mock external assets that would hang in the proxy and block JS execution
  await page.route("**fonts.googleapis.com/**", (route) => {
    route.fulfill({ status: 200, contentType: "text/css", body: "/* fonts mocked */" });
  });
  await page.route("**fonts.gstatic.com/**", (route) => {
    route.fulfill({ status: 200, contentType: "font/woff2", body: "" });
  });

  // Catch-all first (LIFO — specific routes registered after this take priority)
  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/**`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/token**`, (route) => {
    if (route.request().method() !== "POST") return route.continue();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...SUPABASE_SESSION, refresh_token: REFRESH_TOKEN }),
    });
  });

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/central_users**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([MOCK_CENTRAL_USER]),
    });
  });

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/projects**`, (route) => {
    const wantsSingle = (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(wantsSingle ? MOCK_PROJECT : [MOCK_PROJECT]),
    });
  });

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/objectives**`, (route) => {
    const wantsSingle = (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(wantsSingle ? MOCK_OBJECTIVES[0] : MOCK_OBJECTIVES),
    });
  });

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/objective_notes**`, (route) => {
    const method = route.request().method();
    if (method === "POST") {
      // Linking a new task to an objective
      route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OBJ_NOTES),
      });
    }
  });

  // Notes: handle GET (return pool) and POST (create new note)
  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/notes**`, (route) => {
    const method = route.request().method();
    const wantsSingle = (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    if (method === "POST") {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(wantsSingle ? MOCK_NEW_NOTE : [MOCK_NEW_NOTE]),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(notesPool),
      });
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

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe("Navigator — Network graph", () => {
  test.beforeEach(async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page);
  });

  // ── 1. Graph renders ────────────────────────────────────────────────────────
  test("1 · graph renders: canvas, project node, objective nodes, task nodes", async ({ page }) => {
    await page.goto("/navigator?view=network");

    // ReactFlow canvas
    const canvas = page.locator(".react-flow__renderer");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    console.log("✓ ReactFlow canvas visible");

    // Project node
    const projectNode = page.locator(".react-flow__node-project-node");
    await expect(projectNode).toBeVisible({ timeout: 10_000 });
    await expect(projectNode).toContainText("Mental Performance");
    console.log("✓ Project node visible with correct label");

    // 3 objective nodes
    const objNodes = page.locator(".react-flow__node-objective-node");
    await expect(objNodes).toHaveCount(3, { timeout: 10_000 });
    console.log("✓ 3 objective nodes rendered");

    // Task nodes (2 tasks mocked for OBJ_A)
    const taskNodes = page.locator(".react-flow__node-task-node");
    await expect(taskNodes).toHaveCount(2, { timeout: 10_000 });
    await expect(taskNodes.first()).toContainText("Research competitors");
    console.log("✓ 2 task nodes rendered with correct titles");

    // Edges present
    const edges = page.locator(".react-flow__edge");
    const edgeCount = await edges.count();
    // 3 proj→obj edges + 2 obj→task edges = 5 total
    expect(edgeCount).toBeGreaterThanOrEqual(5);
    console.log(`✓ ${edgeCount} edges rendered`);
  });

  // ── 2. Click node → EntityPanel (Sheet dialog) opens ───────────────────────
  test("2 · click objective node → EntityPanel opens", async ({ page }) => {
    await page.goto("/navigator?view=network");

    // Wait for graph to render
    await expect(page.locator(".react-flow__node-objective-node").first()).toBeVisible({
      timeout: 15_000,
    });

    // Click the first objective node body (not the + button)
    const objNode = page.locator(".react-flow__node-objective-node").first();
    // Click the inner div (not the handle)
    await objNode.click({ position: { x: 60, y: 60 } });

    await expect(page.getByPlaceholder("Objective title")).toBeVisible({ timeout: 8_000 });
    console.log("✓ EntityPanel opened after clicking objective node");
  });

  // ── 3. "+" button → creates task + panel opens ─────────────────────────────
  test("3 · '+' on objective node → creates task and opens EntityPanel", async ({ page }) => {
    // Re-setup routes with noteCreated=true so the panel's GET returns the new note
    await setupRoutes(page, { noteCreated: true });
    await page.goto("/navigator?view=network");

    await expect(page.locator(".react-flow__node-objective-node").first()).toBeVisible({
      timeout: 15_000,
    });

    // Find and click the + button in the first objective node
    const addBtn = page
      .locator(".react-flow__node-objective-node button[title='Add task']")
      .first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();

    // EntityPanel should open (createTaskNote → setPanel)
    await expect(page.getByPlaceholder("Note title")).toBeVisible({ timeout: 8_000 });
    console.log("✓ EntityPanel opened after clicking + button");
  });

  // ── 4. Drag → localStorage position persistence ─────────────────────────────
  test("4 · dragging a node persists positions to localStorage", async ({ page }) => {
    await page.goto("/navigator?view=network");

    await expect(page.locator(".react-flow__node-objective-node").first()).toBeVisible({
      timeout: 15_000,
    });

    // Get the first objective node bounding box
    const node = page.locator(".react-flow__node-objective-node").first();
    const box = await node.boundingBox();
    expect(box).not.toBeNull();

    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Simulate drag
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy + 80, { steps: 10 });
    await page.mouse.up();

    // Wait briefly for onNodeDragStop to fire and write to localStorage
    await page.waitForFunction((key) => localStorage.getItem(key) !== null, POSITIONS_LS_KEY, {
      timeout: 3_000,
    });

    const stored = await page.evaluate((key) => localStorage.getItem(key), POSITIONS_LS_KEY);
    expect(stored).not.toBeNull();

    const positions = JSON.parse(stored!) as Record<string, { x: number; y: number }>;
    const nodeIds = Object.keys(positions);
    expect(nodeIds.length).toBeGreaterThan(0);
    console.log(
      `✓ Positions saved to localStorage: ${nodeIds.length} nodes, key ${POSITIONS_LS_KEY}`,
    );
  });

  // ── 5. "Arrange" button → clears saved positions ───────────────────────────
  test("5 · Arrange button resets layout and clears localStorage positions", async ({ page }) => {
    await page.goto("/navigator?view=network");
    await expect(page.locator(".react-flow__node-objective-node").first()).toBeVisible({
      timeout: 15_000,
    });

    // Pre-seed a positions entry so we can verify it's cleared
    await page.evaluate(({ key, val }) => localStorage.setItem(key, val), {
      key: POSITIONS_LS_KEY,
      val: JSON.stringify({ "proj-fake": { x: 999, y: 999 } }),
    });

    const arrangeBtn = page.getByRole("button", { name: "Arrange" });
    await expect(arrangeBtn).toBeVisible({ timeout: 5_000 });
    await arrangeBtn.click();

    // localStorage key should be removed
    const stored = await page.evaluate((key) => localStorage.getItem(key), POSITIONS_LS_KEY);
    expect(stored).toBeNull();
    console.log("✓ Arrange button cleared localStorage positions key");

    // Nodes should still be on canvas
    await expect(page.locator(".react-flow__node-objective-node")).toHaveCount(3, {
      timeout: 5_000,
    });
    console.log("✓ Objective nodes still present after Arrange");
  });

  // ── 6. Zoom controls present and clickable ──────────────────────────────────
  test("6 · zoom controls visible and zoom-in button works", async ({ page }) => {
    await page.goto("/navigator?view=network");
    await expect(page.locator(".react-flow__node-project-node")).toBeVisible({ timeout: 15_000 });

    const controls = page.locator(".react-flow__controls");
    await expect(controls).toBeVisible({ timeout: 5_000 });
    console.log("✓ Controls panel visible");

    const zoomInBtn = page.locator(".react-flow__controls-button").first();
    await expect(zoomInBtn).toBeVisible();

    // Click zoom-in; check transform scale changes on the viewport
    const viewportBefore = await page.locator(".react-flow__viewport").getAttribute("style");
    await zoomInBtn.click();
    const viewportAfter = await page.locator(".react-flow__viewport").getAttribute("style");

    // Styles should differ (scale changed)
    expect(viewportAfter).not.toEqual(viewportBefore);
    console.log("✓ Zoom-in button clicked; viewport transform changed");
  });

  // ── 7. MiniMap visible ──────────────────────────────────────────────────────
  test("7 · MiniMap is rendered", async ({ page }) => {
    await page.goto("/navigator?view=network");
    await expect(page.locator(".react-flow__node-project-node")).toBeVisible({ timeout: 15_000 });

    const minimap = page.locator(".react-flow__minimap");
    await expect(minimap).toBeVisible({ timeout: 5_000 });
    console.log("✓ MiniMap visible");

    // MiniMap should contain SVG nodes representing the graph
    const minimapNodes = page.locator(".react-flow__minimap-node");
    // Wait for at least one minimap node to appear (rendered slightly after the container)
    await expect(minimapNodes.first()).toBeVisible({ timeout: 5_000 });
    const count = await minimapNodes.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✓ MiniMap contains ${count} node representations`);
  });

  // ── 8. Cross-objective edge → migration toast ────────────────────────────────
  test("8 · drawing edge between objectives shows migration-required toast", async ({ page }) => {
    await page.goto("/navigator?view=network");
    await expect(page.locator(".react-flow__node-objective-node").first()).toBeVisible({
      timeout: 15_000,
    });

    // Use the actual handle elements for precise targeting
    const objNodes = page.locator(".react-flow__node-objective-node");
    const srcHandle = objNodes.nth(0).locator(".react-flow__handle-bottom");
    const tgtHandle = objNodes.nth(1).locator(".react-flow__handle-top");

    const srcBox = await srcHandle.boundingBox();
    const tgtBox = await tgtHandle.boundingBox();
    expect(srcBox).not.toBeNull();
    expect(tgtBox).not.toBeNull();

    // Drag from center of source handle to center of target handle
    const srcX = srcBox!.x + srcBox!.width / 2;
    const srcY = srcBox!.y + srcBox!.height / 2;
    const tgtX = tgtBox!.x + tgtBox!.width / 2;
    const tgtY = tgtBox!.y + tgtBox!.height / 2;

    // Drag from source handle to target handle to trigger onConnect
    await page.mouse.move(srcX, srcY);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(tgtX, tgtY, { steps: 20 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    // Toast should appear with migration message
    const toast = page.getByText("Cross-objective links need a DB migration");
    await expect(toast).toBeVisible({ timeout: 5_000 });
    console.log("✓ Migration toast appeared on cross-objective edge draw");
  });

  // ── 9. Empty state when no project selected ─────────────────────────────────
  test("9 · no active project → empty state shown", async ({ page }) => {
    // Override init script to NOT set activeProjectId
    await page.addInitScript(
      ({ authKey, session }: { authKey: string; session: typeof SUPABASE_SESSION }) => {
        localStorage.setItem(authKey, JSON.stringify(session));
        localStorage.removeItem("xcamp-active-project");
      },
      { authKey: LS_AUTH_KEY, session: SUPABASE_SESSION },
    );

    await page.goto("/navigator?view=network");

    // Wait for the page to settle
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    await expect(page.getByText("No project selected")).toBeVisible({ timeout: 10_000 });
    console.log("✓ Empty state 'No project selected' shown when no project chosen");
  });
});
