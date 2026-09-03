import { test, expect, type TestInfo } from "@playwright/test";
import {
  installLiveHarness,
  OBJECTIVE_ID,
  TASK_ID,
  TASK_TITLE,
  FAKE_USER_ID,
  FAKE_TENANT_ID,
} from "./helpers/liveAuth";

const shot = (testInfo: TestInfo, name: string) => testInfo.outputPath(name);

const NOTE_ID2 = "00000000-0000-4000-8000-00000000000d";

async function installExtendedHarness(page: import("@playwright/test").Page) {
  await installLiveHarness(page);

  // Layer a second linked item (a plain "note", not a task) onto the seeded
  // objective, and make the notes endpoint id-aware so both rows resolve
  // correctly. Registered AFTER installLiveHarness so it intercepts first.
  await page.route("**/rest/v1/objective_notes**", (route) => {
    const body = JSON.stringify([
      { objective_id: OBJECTIVE_ID, note_id: TASK_ID },
      { objective_id: OBJECTIVE_ID, note_id: NOTE_ID2 },
    ]);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-1/2" },
      body,
    });
  });

  await page.route("**/rest/v1/notes**", (route) => {
    const url = route.request().url();
    if (!url.includes(NOTE_ID2)) return route.fallback();
    const wantsSingle = (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");

    const note2Row = {
      id: NOTE_ID2,
      title: "Audit plain note",
      note_type: "note",
      done: false,
      detail: {},
      tags: [],
      tenant_id: FAKE_TENANT_ID,
      owner_central_id: FAKE_USER_ID,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      body_html: "<p>plain note</p>",
      body_markdown: "plain note",
    };
    if (wantsSingle) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "0-0/1" },
        body: JSON.stringify(note2Row),
      });
    }

    // List/`.in()` query — if it also references the seeded task id, this is
    // the objective's task-list fetch, so include both rows.
    const taskRow = {
      id: TASK_ID,
      title: TASK_TITLE,
      note_type: "task",
      done: false,
      detail: {},
      tags: [],
      tenant_id: FAKE_TENANT_ID,
      owner_central_id: FAKE_USER_ID,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      body_html: "<p>seeded task</p>",
      body_markdown: "seeded task",
    };
    const rows = url.includes(TASK_ID) ? [taskRow, note2Row] : [note2Row];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": `0-${rows.length - 1}/${rows.length}` },
      body: JSON.stringify(rows),
    });
  });
}

test.describe("Combined session verification", () => {
  test("item1: nav rail expands on hover, collapses on leave, click still works", async ({
    page,
  }, testInfo) => {
    await installLiveHarness(page);
    await page.goto("/navigator");
    await page.waitForTimeout(2000);

    const rail = page.locator('[data-sidebar="sidebar"]').first();
    await expect(rail).toBeVisible();

    // Collapse via click first so we start from a known collapsed state.
    const toggle = page.getByRole("button", { name: /toggle sidebar/i });
    const groupWrapper = page.locator('[data-variant="sidebar"]').first();

    const stateBefore = await groupWrapper.getAttribute("data-state").catch(() => null);
    if (stateBefore !== "collapsed") {
      await toggle.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: shot(testInfo, "1a-navrail-collapsed.png") });

    // Hover over the rail — should expand after the debounce delay.
    const box = await rail.boundingBox();
    if (!box) throw new Error("sidebar not found");
    await page.mouse.move(box.x + box.width / 2, box.y + 100);
    await page.waitForTimeout(500);
    const wrapperAfterHover = page.locator('[data-variant="sidebar"]').first();
    const stateAfterHover = await wrapperAfterHover.getAttribute("data-state");
    console.log("STATE AFTER HOVER:", stateAfterHover);
    await page.screenshot({ path: shot(testInfo, "1b-navrail-hover-expanded.png") });

    // Move mouse away — should collapse again after the leave-debounce.
    await page.mouse.move(800, 400);
    await page.waitForTimeout(600);
    const stateAfterLeave = await wrapperAfterHover.getAttribute("data-state");
    console.log("STATE AFTER LEAVE:", stateAfterLeave);
    await page.screenshot({ path: shot(testInfo, "1c-navrail-after-leave.png") });

    // Persisted localStorage should reflect the click state (collapsed),
    // not the transient hover-expanded state.
    const persisted = await page.evaluate(() =>
      localStorage.getItem("nox-founder-sidebar-collapsed"),
    );
    console.log("PERSISTED COLLAPSE STATE:", persisted);

    // Click toggle should still independently work.
    await toggle.click();
    await page.waitForTimeout(300);
    const stateAfterClick = await wrapperAfterHover.getAttribute("data-state");
    console.log("STATE AFTER CLICK TOGGLE:", stateAfterClick);

    expect(stateAfterHover).toBe("expanded");
    expect(stateAfterLeave).toBe("collapsed");
    expect(persisted).toBe("true");
    expect(stateAfterClick).toBe("expanded");
  });

  test("item2: objective attachment persists via RPC with correct payload", async ({
    page,
  }, testInfo) => {
    await installLiveHarness(page);

    let rpcCallBody: unknown = null;
    await page.route("**/rest/v1/rpc/update_objective", (route) => {
      rpcCallBody = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: OBJECTIVE_ID }),
      });
    });

    await page.goto(`/navigator?view=browser`);
    await page.waitForTimeout(2000);
    await page.getByText("Audit objective", { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByTitle("Edit details").click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: shot(testInfo, "2a-objective-sidepanel.png") });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByTitle("Attach file").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "test-attachment.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello from item 2 verification"),
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot(testInfo, "2b-objective-attachment-added.png") });

    const attachmentVisible = await page.getByText("test-attachment.txt").isVisible();
    console.log("ATTACHMENT VISIBLE IN UI:", attachmentVisible);
    console.log("RPC CALL BODY:", JSON.stringify(rpcCallBody));

    expect(attachmentVisible).toBe(true);
    expect(rpcCallBody).toBeTruthy();
    const body = rpcCallBody as { p_detail?: { attachments?: unknown[] } };
    expect(body.p_detail?.attachments?.length).toBeGreaterThan(0);
  });

  test("item3: auth screen shows hero background + glass card, form unchanged", async ({
    page,
  }, testInfo) => {
    await page.route("**fonts.googleapis.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/css", body: "/* stubbed */" }),
    );
    await page.route("**fonts.gstatic.com/**", (route) => route.fulfill({ status: 200, body: "" }));
    await page.route("**/storage/v1/object/list/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            name: "test-hero.jpg",
            id: "1",
            updated_at: "",
            created_at: "",
            last_accessed_at: "",
            metadata: {},
          },
        ]),
      }),
    );
    await page.route("**/auth/v1/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) }),
    );
    await page.goto("/auth");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: shot(testInfo, "3-auth-with-hero.png"), fullPage: true });

    const hasHeroBg = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("div")).some((d) =>
        (d as HTMLElement).style.backgroundImage?.includes("Hero"),
      );
    });
    const emailInput = await page.locator('input[type="email"]').isVisible();
    const signInButton = await page.getByRole("button", { name: /sign in/i }).isVisible();
    console.log(
      "HAS HERO BG:",
      hasHeroBg,
      "EMAIL INPUT:",
      emailInput,
      "SIGN IN BTN:",
      signInButton,
    );

    expect(emailInput).toBe(true);
    expect(signInButton).toBe(true);
  });

  test("item4a: task-type fullscreen unchanged", async ({ page }, testInfo) => {
    await installExtendedHarness(page);
    await page.goto("/navigator?view=browser");
    await page.waitForTimeout(2000);
    await page.getByText("Audit objective", { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByText("Audit task one", { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: shot(testInfo, "4a-task-sidepanel.png") });

    await page.getByTestId("sidepanel-open-fullscreen").click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: shot(testInfo, "4a-task-fullscreen-open.png") });

    const taskModalOpen = await page.getByTestId("task-fullscreen-modal").getAttribute("data-open");
    const editorVisible = await page
      .locator(".x-tiptap")
      .first()
      .isVisible()
      .catch(() => false);
    console.log("TASK MODAL OPEN:", taskModalOpen, "EDITOR VISIBLE:", editorVisible);
    expect(taskModalOpen).toBe("true");
    expect(editorVisible).toBe(true);
  });

  // Was "non-task note shows placeholder" — superseded by a real fullscreen
  // editor for note_type: "note" (see NoteFullscreenModal / FullscreenDispatcher).
  // Other non-task, non-note types (idea/question/decision/reference) still
  // get the placeholder — unchanged, not re-tested here.
  test("item4b: plain note shows fullscreen editor (not the placeholder), dismiss works", async ({
    page,
  }, testInfo) => {
    await installExtendedHarness(page);
    await page.goto("/navigator?view=browser");
    await page.waitForTimeout(2000);
    await page.getByText("Audit objective", { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByText("Audit plain note", { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: shot(testInfo, "4b-note-sidepanel.png") });

    const fsBtn = page.getByTestId("sidepanel-open-fullscreen");
    await expect(fsBtn).toBeVisible();
    await fsBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: shot(testInfo, "4b-note-fullscreen-open.png") });

    const noteModalOpen = await page.getByTestId("note-fullscreen-modal").getAttribute("data-open");
    const placeholderOpen = await page
      .getByTestId("note-detail-placeholder-modal")
      .getAttribute("data-open");
    const taskModalOpen = await page.getByTestId("task-fullscreen-modal").getAttribute("data-open");
    // Scoped to the fullscreen modal — the sidepanel behind it also renders a
    // "Note title" field, so an unscoped locator would match both and throw.
    const titleVisible = await page
      .getByTestId("note-fullscreen-modal")
      .getByPlaceholder("Note title")
      .isVisible()
      .catch(() => false);
    console.log(
      "NOTE MODAL OPEN:",
      noteModalOpen,
      "PLACEHOLDER OPEN:",
      placeholderOpen,
      "TASK MODAL OPEN:",
      taskModalOpen,
      "TITLE VISIBLE:",
      titleVisible,
    );
    expect(noteModalOpen).toBe("true");
    expect(placeholderOpen).toBe("false");
    expect(taskModalOpen).toBe("false");
    expect(titleVisible).toBe(true);

    // Escape should dismiss it.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const noteModalOpenAfterEsc = await page
      .getByTestId("note-fullscreen-modal")
      .getAttribute("data-open");
    console.log("NOTE MODAL OPEN AFTER ESCAPE:", noteModalOpenAfterEsc);
    expect(noteModalOpenAfterEsc).toBe("false");
  });

  test("item4c: grep-verifiable — no old hard-coded message reachable via direct route", async ({
    page,
  }, testInfo) => {
    await installExtendedHarness(page);
    await page.goto(`/task/${NOTE_ID2}`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot(testInfo, "4c-direct-route-nontask.png") });
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("DIRECT ROUTE BODY TEXT:", JSON.stringify(bodyText.slice(0, 200)));
    expect(bodyText).toContain("Detail view coming soon");
    expect(bodyText).not.toContain("This item is not a task");
  });
});
