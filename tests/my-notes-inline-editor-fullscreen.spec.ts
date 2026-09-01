import { test, expect, type Page } from "@playwright/test";

const SUPABASE_PROJECT_REF = "ueebzuleyrnsrxbowdfa";
const LS_AUTH_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const ACTIVE_PROJECT_LS_KEY = "xcamp-active-project";
const TENANT_ID = "30a00e60-7cae-4a5e-a311-b3be998e7113";
const CENTRAL_USER_ID = "b4c5d6e7-f890-4bcd-8ef1-234567890abc";
const PROJECT_ID = "c5d6e7f8-90ab-4cde-bf12-34567890abcd";
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

const MOCK_NOTE = {
  id: NOTE_ID, title: "Kickoff thoughts", note_type: "note", done: false,
  body_html: "<p>Some note body</p>", body_markdown: "Some note body", tags: [], detail: {},
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
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsSingle ? {} : []) });
  });

  await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/notes**`, (r) => {
    const url = r.request().url();
    const wantsSingle = (r.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    if (url.includes(NOTE_ID)) {
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsSingle ? MOCK_NOTE : [MOCK_NOTE]) });
    } else if (url.includes("owner_central_id")) {
      // listNotes()
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_NOTE]) });
    } else {
      r.fulfill({ status: 200, contentType: "application/json", body: wantsSingle ? "{}" : "[]" });
    }
  });
}

async function injectSession(page: Page) {
  await page.addInitScript(
    ({ authKey, session }) => {
      localStorage.setItem(authKey, JSON.stringify(session));
    },
    { authKey: LS_AUTH_KEY, session: SUPABASE_SESSION },
  );
}

test.describe("My Notes inline editor + fullscreen note view", () => {
  test("clicking a note renders it inline in the middle column, not the sidepanel overlay", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page);
    await page.goto("/notes");
    await expect(page.getByText(MOCK_NOTE.title)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Select a note or create a new one.")).toBeVisible();

    await page.getByText(MOCK_NOTE.title).first().click();

    // Renders inline: title textarea populated, in the middle column.
    await expect(page.getByPlaceholder("Note title")).toHaveValue(MOCK_NOTE.title);
    await expect(page.getByText("Select a note or create a new one.")).toHaveCount(0);

    // The generic right-hand sidepanel overlay must NOT have opened (both
    // fullscreen modals are always mounted, gated by data-open, not count).
    await expect(page.getByTestId("note-detail-placeholder-modal")).toHaveAttribute("data-open", "false");
    await expect(page.getByTestId("note-fullscreen-modal")).toHaveAttribute("data-open", "false");

    await page.screenshot({ path: "test-results/my-notes-fullscreen/inline-editor.png", fullPage: true });
  });

  test("fullscreen note view opens as a simple enlarged editor, no tab/accordion chrome", async ({ page }) => {
    await setupRoutes(page);
    await injectSession(page);
    await page.goto("/notes");
    await expect(page.getByText(MOCK_NOTE.title)).toBeVisible({ timeout: 15_000 });
    await page.getByText(MOCK_NOTE.title).first().click();
    await expect(page.getByPlaceholder("Note title")).toHaveValue(MOCK_NOTE.title);

    await page.getByRole("button", { name: "Open fullscreen" }).click();

    const modal = page.getByTestId("note-fullscreen-modal");
    await expect(modal).toHaveAttribute("data-open", "true");
    await expect(modal.getByPlaceholder("Note title")).toHaveValue(MOCK_NOTE.title);

    // No task-fullscreen tab/accordion chrome leaked into this view.
    await expect(modal.getByText("About", { exact: true })).toHaveCount(0);
    await expect(modal.getByText("Do & Document")).toHaveCount(0);
    await expect(modal.getByText("Linked Items")).toHaveCount(0);
    await expect(modal.getByRole("button", { name: /^(Note|Task|Idea|Question|Decision|Resource) ?/ })).toHaveCount(0);

    await page.screenshot({ path: "test-results/my-notes-fullscreen/fullscreen-note.png", fullPage: true });

    // Edits save — type into the title and confirm a PATCH goes out.
    let patched = false;
    await page.route(`**/${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/notes**`, async (route) => {
      if (route.request().method() === "PATCH") {
        patched = true;
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      }
      return route.fallback();
    });
    await modal.getByPlaceholder("Note title").fill("Kickoff thoughts, revised");
    await page.waitForTimeout(1800);
    expect(patched).toBe(true);

    await modal.getByRole("button", { name: "Close" }).click();
    await expect(modal).toHaveAttribute("data-open", "false");
  });
});
