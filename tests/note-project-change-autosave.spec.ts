import { test, expect } from "@playwright/test";
import { installLiveHarness, TASK_TITLE, PROJECT_ID } from "./helpers/liveAuth";

// Regression test: same root cause as note-type-change-autosave.spec.ts, but
// for the project field — reassigning a note's project with no title/body
// edit used to be silently dropped (autosave only watched body/title).
test("changing a note's project alone (no title/body edit) is persisted", async ({ page }) => {
  await installLiveHarness(page);

  const patchBodies: Record<string, unknown>[] = [];
  await page.route("**/rest/v1/notes*", async (route) => {
    if (route.request().method() === "PATCH") {
      patchBodies.push(route.request().postDataJSON());
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.fallback();
  });

  await page.goto("/notes");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1000);

  const clearAll = page.getByText("Clear all", { exact: true });
  if (await clearAll.isVisible().catch(() => false)) {
    await clearAll.click();
    await page.waitForTimeout(500);
  }

  await page.getByText(TASK_TITLE, { exact: true }).first().click();
  await page.waitForTimeout(800);

  // Open the meta section and assign a project — the only change made.
  await page.getByRole("button", { name: /^Task/ }).first().click();
  await page.waitForTimeout(300);
  await page.getByText("No project", { exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByTestId("right-panel-slot").getByText("Audit project", { exact: true }).click();

  await page.waitForTimeout(1500);

  const sawProjectPatch = patchBodies.some(
    (b) => (b.detail as Record<string, unknown> | undefined)?.project_id === PROJECT_ID,
  );
  expect(sawProjectPatch).toBe(true);
});
