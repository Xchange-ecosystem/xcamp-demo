import { test, expect } from "@playwright/test";
import { installLiveHarness, TASK_TITLE } from "./helpers/liveAuth";

// Regression test: NoteEditor's autosave used to only watch [debouncedBody,
// debouncedTitle], so changing the note type (or project/tags/attachments)
// without also touching the title or body was silently dropped — the value
// changed in local state, "Task" → "Note" looked applied in the UI, but
// closing the panel never sent it to the database. See NoteEditor.tsx.
test("changing a note's type alone (no title/body edit) is persisted", async ({ page }) => {
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

  // Notes defaults to the note-only type filter. Explicitly include tasks so
  // this task fixture is visible without changing the user's saved defaults.
  await page.getByRole("button", { name: "Filter notes" }).click();
  await page.getByRole("button", { name: "Task", exact: true }).click();
  await page.getByRole("button", { name: "Filter notes" }).click();

  await page.getByText(TASK_TITLE, { exact: true }).first().click({ timeout: 10_000 });
  await page.waitForTimeout(800);

  // Open the collapsible type/project/tags section (labelled with the note's
  // current type, "Task") and switch it to "Note" — the only change made.
  await page.getByRole("button", { name: /^Task/ }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Note", exact: true }).click();

  // No debounce applies to metadata fields — give the immediate autosave
  // effect a moment to fire.
  await page.waitForTimeout(1500);

  expect(patchBodies.some((b) => b.note_type === "note")).toBe(true);
});
