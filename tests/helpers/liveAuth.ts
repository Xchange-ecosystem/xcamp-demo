import type { Page } from "@playwright/test";

// Supabase project ref from VITE_SUPABASE_URL — determines the localStorage key
// supabase-js reads its persisted session from.
const PROJECT_REF = "ueebzuleyrnsrxbowdfa";
export const AUTH_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

export const FAKE_USER_ID = "00000000-0000-4000-8000-000000000001";
export const FAKE_TENANT_ID = "00000000-0000-4000-8000-0000000000t1".replace("t1", "0002");

const FAKE_SESSION = {
  access_token: "fake-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "fake-refresh-token",
  user: {
    id: FAKE_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "audit@xchange.eco",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  },
};

const CENTRAL_USER = {
  id: FAKE_USER_ID,
  tenant_id: FAKE_TENANT_ID,
  display_name: "Audit User",
  email: "audit@xchange.eco",
  preferences: {},
};

// Objectives / tasks returned to the Navigator so the task column has a row to click.
export const PROJECT_ID = "00000000-0000-4000-8000-00000000000a";
export const OBJECTIVE_ID = "00000000-0000-4000-8000-00000000000b";
export const TASK_ID = "00000000-0000-4000-8000-00000000000c";
export const TASK_TITLE = "Audit task one";

const PROJECT_ROW = {
  id: PROJECT_ID,
  title: "Audit project",
  description: "seeded project",
  feature_image: null,
  color: null,
  tenant_id: FAKE_TENANT_ID,
  owner_central_id: FAKE_USER_ID,
};

const OBJECTIVE_ROW = {
  id: OBJECTIVE_ID,
  title: "Audit objective",
  description: "seeded",
  project_id: PROJECT_ID,
  sort_order: 0,
  tasks_generation_status: "idle",
  tenant_id: FAKE_TENANT_ID,
  owner_central_id: FAKE_USER_ID,
  status: "open",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const TASK_ROW = {
  id: TASK_ID,
  title: TASK_TITLE,
  note_type: "task",
  done: false,
  detail: { project_id: PROJECT_ID },
  tags: [],
  tenant_id: FAKE_TENANT_ID,
  owner_central_id: FAKE_USER_ID,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  body_html: "<p>seeded task</p>",
  body_markdown: "seeded task",
};

/**
 * Seed a logged-in session and stub every Supabase/Vox network call so routes
 * render their authenticated UI without a real backend.
 */
export async function installLiveHarness(page: Page): Promise<void> {
  // The sandbox proxy blocks fonts.googleapis.com. React 19 suspends on a
  // <link rel="stylesheet"> that never resolves, which blanks the whole app —
  // an environment artifact, not an app bug. Stub the font CSS so the tree renders.
  await page.route("**fonts.googleapis.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "/* stubbed */" }),
  );
  await page.route("**fonts.gstatic.com/**", (route) => route.fulfill({ status: 200, body: "" }));

  await page.addInitScript(
    ([key, session, projectId]) => {
      localStorage.setItem(key as string, JSON.stringify(session));
      localStorage.setItem("xcamp-active-project", projectId as string);
    },
    [AUTH_STORAGE_KEY, FAKE_SESSION, PROJECT_ID] as const,
  );

  await page.route("**/auth/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...FAKE_SESSION, ...FAKE_SESSION.user }),
    }),
  );

  await page.route("**/rest/v1/**", (route) => {
    const url = route.request().url();
    const wantsSingle = (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");

    let body: unknown = [];
    if (url.includes("/central_users")) body = wantsSingle ? CENTRAL_USER : [CENTRAL_USER];
    else if (url.includes("/objectives")) body = wantsSingle ? OBJECTIVE_ROW : [OBJECTIVE_ROW];
    else if (url.includes("/projects")) body = wantsSingle ? PROJECT_ROW : [PROJECT_ROW];
    else if (url.includes("/object_memberships")) body = [{ object_id: PROJECT_ID }];
    else if (url.includes("/objective_notes"))
      body = [{ objective_id: OBJECTIVE_ID, note_id: TASK_ID }];
    else if (url.includes("/project_notes")) body = [{ note_id: TASK_ID, project_id: PROJECT_ID }];
    // /notes must come last — several of the tables above end in "notes".
    else if (url.includes("/notes")) body = wantsSingle ? TASK_ROW : [TASK_ROW];

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-0/1" },
      body: JSON.stringify(body),
    });
  });

  await page.route("**/functions/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );

  await page.route("**xcampapi.xchange.eco/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
}
