import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { installLiveHarness } from "./helpers/liveAuth";

const OUT = process.env.LOGBOOK_OUT ?? "/tmp/logbook-fix";
fs.mkdirSync(OUT, { recursive: true });
const shot = (name: string) => path.join(OUT, name);

test.describe("BL-26 — Logbook submenu 4-item restore", () => {
  test.beforeEach(async ({ page }) => {
    await installLiveHarness(page);
    page.on("pageerror", (e) => console.log("[page error]", e.message));
  });

  test("sidebar shows 4 items in order and both + links work", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: shot("0-initial.png"), fullPage: false });

    const sidebar = page.locator('[data-sidebar="sidebar"]');

    // Expand the Logbook submenu.
    await sidebar.getByRole("button", { name: "Logbook", exact: true }).click({ timeout: 10000 });
    await page.waitForTimeout(300);

    const items = await page.$$eval("aside li a, aside li button, [data-sidebar] a, [data-sidebar] button", (els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean),
    );
    console.log("SIDEBAR_ITEMS", JSON.stringify(items));

    const subItems = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll("ul li span"))
        .map((s) => s.textContent?.trim())
        .filter(Boolean);
      return spans;
    });
    console.log("ALL_SPANS", JSON.stringify(subItems));

    await page.screenshot({ path: shot("1-sidebar-expanded.png"), fullPage: false });

    const order = subItems.filter((s) =>
      ["My Journal", "New Journal Entry", "My Notes", "New Note"].includes(s as string),
    );
    console.log("ORDER", JSON.stringify(order));
    expect(order).toEqual(["My Journal", "New Journal Entry", "My Notes", "New Note"]);

    // Click "New Journal Entry".
    await sidebar.getByText("New Journal Entry", { exact: true }).click();
    await page.waitForTimeout(1200);
    const urlAfterJournal = new URL(page.url());
    console.log("URL_AFTER_NEW_JOURNAL", urlAfterJournal.pathname + urlAfterJournal.search);
    await page.screenshot({ path: shot("2-new-journal-entry.png"), fullPage: false });
    expect(urlAfterJournal.pathname).toBe("/journal");
    expect(urlAfterJournal.searchParams.get("new")).toBeNull();

    // Back to home, expand again, click "New Note".
    await page.goto("/home");
    await page.waitForTimeout(800);
    await sidebar.getByRole("button", { name: "Logbook", exact: true }).click({ timeout: 10000 });
    await page.waitForTimeout(300);
    await sidebar.getByText("New Note", { exact: true }).click();
    await page.waitForTimeout(1200);
    const urlAfterNote = new URL(page.url());
    console.log("URL_AFTER_NEW_NOTE", urlAfterNote.pathname + urlAfterNote.search);
    await page.screenshot({ path: shot("3-new-note.png"), fullPage: false });
    expect(urlAfterNote.pathname).toBe("/notes");
    expect(urlAfterNote.searchParams.get("new")).toBeNull();
  });
});
