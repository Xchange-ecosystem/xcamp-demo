/**
 * E2E test: Backcaster QuickRoad UI flow
 *
 * Connection strategy:
 *  - Supabase REST/Storage: mocked (returns known data; browser can't reach Supabase directly)
 *  - Backcaster API (xcampapi.xchange.eco): intercepted via page.route() + route.fetch()
 *    which forwards the request from Node.js (which uses HTTPS_PROXY) instead of the
 *    browser (which can't reach external HTTPS through the env proxy).
 *
 * Covers:
 *  1. InputStep: type goal, submit → interpret → transition to InterpretStep
 *  2. InterpretStep: verify coherent interpretation text is shown
 *  3. Re-interpret bug check: Re-interpret must send state.rawInput (original goal),
 *     NOT state.interpretation (the AI output) — confirmed bug in InterpretStep.tsx:18
 *  4. GenerateStep: auto-generates a plan tree; verify title + nodes present
 *  5. DB check: session status confirmed via Supabase MCP after the test
 */

import { test, expect } from "@playwright/test";

const ACCESS_TOKEN =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRkOWVlYWNlLWNlMzYtNDI0Yy04OTBiLWQwMTE5MjAyYzViOCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3VlZWJ6dWxleXJuc3J4Ym93ZGZhLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiNGM1ZDZlNy1mODkwLTRiY2QtOGVmMS0yMzQ1Njc4OTBhYmMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg0ODQxMzM1LCJpYXQiOjE3ODQ4Mzc3MzUsImVtYWlsIjoiY2MtdGVzdC1waGFzZTYxQHhjYW1wLmxvY2FsIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJmdWxsX25hbWUiOiJDQyBUZXN0IFBoYXNlIDYuMSIsInRlbmFudF9pZCI6IjMwYTAwZTYwLTdjYWUtNGE1ZS1hMzExLWIzYmU5OThlNzExMyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzgzODE5MDc2fV0sInNlc3Npb25faWQiOiIxYTIwNTNiMS0wOTY5LTQ5MDEtYTYxOS1mZDJkOTA3ZDlhYmQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.3guM4q4hX4qbMSzpdrA28cFse5xX_2RlUmtuYAyqrHIcopRqc6ge0A6o0yC2u9LJIA5Gf7AzofccqN0R9Y-F8w";

const REFRESH_TOKEN = "groe6dmql4qx";
const SUPABASE_PROJECT_REF = "ueebzuleyrnsrxbowdfa";
const LS_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

const MOCK_CENTRAL_USER = {
  id: "b4c5d6e7-f890-4bcd-8ef1-234567890abc",
  tenant_id: "30a00e60-7cae-4a5e-a311-b3be998e7113",
  display_name: "CC Test Phase 6.1",
  email: "cc-test-phase61@xcamp.local",
  preferences: {},
};

const SUPABASE_SESSION = {
  access_token: ACCESS_TOKEN,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 1784841335,
  refresh_token: REFRESH_TOKEN,
  user: {
    id: "b4c5d6e7-f890-4bcd-8ef1-234567890abc",
    aud: "authenticated",
    role: "authenticated",
    email: "cc-test-phase61@xcamp.local",
    email_confirmed_at: "2026-07-08T12:13:03.006423Z",
    phone: "",
    confirmed_at: "2026-07-08T12:13:03.006423Z",
    last_sign_in_at: "2026-07-12T01:17:56.218396Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {
      full_name: "CC Test Phase 6.1",
      tenant_id: "30a00e60-7cae-4a5e-a311-b3be998e7113",
    },
    created_at: "2026-07-08T12:13:03.006423Z",
    updated_at: "2026-07-23T20:15:35.576754Z",
    is_anonymous: false,
  },
};

const GOAL_TEXT =
  "Build a SaaS platform for freelance designers to manage clients, projects, and invoices";

test.describe("Backcaster QuickRoad E2E", () => {
  test("full flow: InputStep → InterpretStep (re-interpret bug check) → GenerateStep", async ({
    page,
  }) => {
    // ── Mock Supabase REST/Storage ─────────────────────────────────────────
    // IMPORTANT: Playwright uses LIFO route matching (last-registered wins).
    // Register catch-alls FIRST so specific routes take precedence.

    // Catch-all for any Supabase REST call not explicitly handled
    await page.route("**/rest/v1/**", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    // Supabase Storage (hero images)
    await page.route("**/storage/v1/**", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    // Auth token refresh fallback
    await page.route("**/auth/v1/token**", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: ACCESS_TOKEN,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: 1784841335,
          refresh_token: REFRESH_TOKEN,
          user: SUPABASE_SESSION.user,
        }),
      });
    });
    // central_users lookup (must be registered LAST to take priority over catch-all)
    await page.route("**/rest/v1/central_users**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([MOCK_CENTRAL_USER]),
      });
    });

    // ── Proxy backcaster API through Node.js (uses HTTPS_PROXY) ───────────
    // Chromium can't reach xcampapi.xchange.eco directly through the env proxy.
    // route.fetch() runs in Node.js, which does respect HTTPS_PROXY.
    const interpretPayloads: Array<{ raw_input: string }> = [];

    await page.route("**/xcampapi.xchange.eco/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      // Capture interpret call payloads for bug verification
      if (url.includes("/backcaster/interpret") && method === "POST") {
        try {
          const body = JSON.parse(route.request().postData() ?? "{}") as {
            raw_input?: string;
          };
          interpretPayloads.push({ raw_input: body.raw_input ?? "" });
          console.log(`[intercept] /interpret raw_input: "${(body.raw_input ?? "").slice(0, 100)}"`);
        } catch {
          // ignore
        }
      }

      // Forward the request from Node.js (which uses HTTPS_PROXY) to the real API
      try {
        const response = await route.fetch();
        await route.fulfill({ response });
      } catch (e) {
        console.error(`[proxy] Failed to fetch ${url}:`, e);
        await route.abort("failed");
      }
    });

    // ── Inject Supabase session ────────────────────────────────────────────
    await page.addInitScript(
      ({ key, session }: { key: string; session: typeof SUPABASE_SESSION }) => {
        localStorage.setItem(key, JSON.stringify(session));
      },
      { key: LS_KEY, session: SUPABASE_SESSION },
    );

    await page.goto("/project-builder");

    // ── Step 1: InputStep ──────────────────────────────────────────────────
    console.log("\n[STEP 1] Waiting for InputStep textarea…");
    const goalTextarea = page.locator("textarea").first();
    await expect(goalTextarea).toBeVisible({ timeout: 20_000 });

    await goalTextarea.fill(GOAL_TEXT);
    console.log(`[STEP 1] Typed goal: "${GOAL_TEXT.slice(0, 60)}…"`);

    // Wait for BMPO mode to load (button: "Preparing BPMO mode" → "Continue")
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 30_000 });

    console.log("[STEP 1] Clicking Continue (triggers createSession + interpret)…");
    await page.getByRole("button", { name: "Continue" }).click();

    // ── Step 2: InterpretStep ──────────────────────────────────────────────
    console.log('\n[STEP 2] Waiting for "Here\'s what I understood"…');
    await expect(page.getByText("Here's what I understood")).toBeVisible({ timeout: 90_000 });

    const interpretTextarea = page.locator("textarea").first();
    await expect(interpretTextarea).toBeVisible();
    const interpretationText = await interpretTextarea.inputValue();

    console.log(`[STEP 2] Interpretation (${interpretationText.length} chars):`);
    console.log("  " + interpretationText.slice(0, 300) + (interpretationText.length > 300 ? "…" : ""));

    // Coherence: should be a meaningful paragraph
    expect(interpretationText.trim().length, "Interpretation should be non-trivial").toBeGreaterThan(50);

    // ── Step 3: Re-interpret bug verification ──────────────────────────────
    console.log("\n[STEP 3] Testing Re-interpret button for bug…");

    await page.getByRole("button", { name: "Re-interpret" }).click();

    // Wait for the second interpret API response
    await page.waitForResponse(
      (resp) => resp.url().includes("/backcaster/interpret") && resp.request().method() === "POST",
      { timeout: 90_000 },
    );

    expect(
      interpretPayloads.length,
      "Should have ≥2 interpret calls (initial + re-interpret)",
    ).toBeGreaterThanOrEqual(2);

    const reinterpretCall = interpretPayloads[interpretPayloads.length - 1];

    console.log(`\n[STEP 3 BUG CHECK]`);
    console.log(`  Original goal:          "${GOAL_TEXT.slice(0, 80)}"`);
    console.log(`  Interpretation:         "${interpretationText.slice(0, 80)}"`);
    console.log(`  Re-interpret sent:      "${reinterpretCall.raw_input.slice(0, 80)}"`);

    const bugPresent = reinterpretCall.raw_input === interpretationText;
    const fixVerified = reinterpretCall.raw_input === GOAL_TEXT;

    if (bugPresent) {
      console.log("\n  ❌ BUG CONFIRMED: Re-interpret sends state.interpretation instead of state.rawInput");
      console.log("     File: src/components/quickroad/InterpretStep.tsx line 18");
      console.log("     Bug:  raw_input: state.interpretation");
      console.log("     Fix:  raw_input: state.rawInput");
    } else if (fixVerified) {
      console.log("\n  ✅ FIX VERIFIED: Re-interpret correctly sends the original goal text");
    } else {
      console.log("\n  ⚠️  UNEXPECTED: sent neither goal nor interpretation");
      console.log("     Sent:", reinterpretCall.raw_input.slice(0, 200));
    }

    // After the fix, this assertion must pass (Re-interpret sends the original goal).
    // If it fails, the bug has regressed.
    expect(fixVerified, "Re-interpret must send state.rawInput (the original goal), not state.interpretation").toBe(true);

    // ── Step 4: GenerateStep ───────────────────────────────────────────────
    console.log("\n[STEP 4] Clicking 'Create plan'…");
    await page.getByRole("button", { name: "Create plan" }).click();

    await expect(page.locator("text=Shaping your plan")).toBeVisible({ timeout: 10_000 });
    console.log("[STEP 4] Generating plan (RAG-backed, may take 60-120s)…");

    await expect(page.getByRole("button", { name: "Build project" })).toBeVisible({
      timeout: 180_000,
    });

    const titleInput = page.locator('[aria-label="Project title"]');
    await expect(titleInput).toBeVisible();
    const projectTitle = await titleInput.inputValue();

    const nodeCards = page.locator(".space-y-3 > *");
    const cardCount = await nodeCards.count();

    console.log(`\n[STEP 4] Plan generated:`);
    console.log(`  Title:       "${projectTitle}"`);
    console.log(`  Root nodes:  ${cardCount}`);

    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      const cardText = (await nodeCards.nth(i).textContent() ?? "").trim().slice(0, 80);
      console.log(`  Node ${i + 1}: ${cardText}`);
    }

    expect(projectTitle.trim().length, "Project title should be non-empty").toBeGreaterThan(3);
    expect(cardCount, "Plan should have at least 2 root nodes").toBeGreaterThanOrEqual(2);

    console.log("\n[DONE] QuickRoad E2E completed.");
    console.log(`  Bug present:  ${bugPresent}`);
    console.log(`  Fix verified: ${fixVerified}`);
  });
});
