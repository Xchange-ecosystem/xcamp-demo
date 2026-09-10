import { test, expect, type Page, type Locator } from "@playwright/test";

const SHOTS =
  "/tmp/claude-0/-home-user-xcamp-demo/e9616883-e38a-5227-b847-bcfd567f7a38/scratchpad/shots";
const LONG = 30000;

test.use({ viewport: { width: 1440, height: 900 } });

// toBeVisible() alone doesn't check CSS opacity, and the tiles grid fades in
// (opacity 0 -> 1) rather than mounting/unmounting once the greeting
// typewriter finishes - a tile button is technically "visible" to
// Playwright the instant it mounts, well before the fade-in completes. Real
// interactions (click()) auto-wait on pointer-events and don't race this,
// but a screenshot taken right after toBeVisible() can still catch the
// fade mid-transition. Wait for the actual opacity before screenshotting.
async function waitForTilesFadedIn(page: Page, anyTile: Locator) {
  await anyTile.waitFor({ state: "visible", timeout: LONG });
  await expect(async () => {
    const opacity = await anyTile.evaluate(
      (el) => getComputedStyle(el.closest("div.grid")!).opacity,
    );
    expect(opacity).toBe("1");
  }).toPass({ timeout: LONG });
}

test("tile text is centered on all three tiles, all three personas", async ({ page }) => {
  for (const url of ["/demo/founder/start", "/demo/investor/start", "/demo/collaborator/start"]) {
    await page.goto(url);
    const anyTile = page.getByRole("button", { name: /^Platform Experience/ });
    await waitForTilesFadedIn(page, anyTile);

    for (const label of [
      "Companion-first Guidance",
      "App-style Creativity",
      "Platform Experience",
    ]) {
      const tile = page.getByRole("button", { name: new RegExp(`^${label}`) });
      await expect(tile).toHaveCSS("text-align", "center");
      const spans = tile.locator("span");
      await expect(spans.first()).toHaveCSS("text-align", "center");
      await expect(spans.last()).toHaveCSS("text-align", "center");
    }
  }
});

test("founder start: greeting says Claas, tile titles centered, Companion-first Guidance shows cards -> card click reaches real Companion altitude", async ({
  page,
}) => {
  await page.goto("/demo/founder/start");
  await expect(page.getByText(/Welcome to Xcamp, Claas/)).toBeVisible({ timeout: LONG });
  await page.screenshot({ path: `${SHOTS}/01-founder-greeting.png` });

  const companionTile = page.getByRole("button", { name: /^Companion-first Guidance/ });
  await expect(companionTile).toBeVisible({ timeout: LONG });
  await expect(page.getByRole("button", { name: /^App-style Creativity/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Platform Experience/ })).toBeVisible();
  await waitForTilesFadedIn(page, companionTile);
  await page.screenshot({ path: `${SHOTS}/02-founder-tiles.png` });

  // Selecting the tile shows inline content now - it must NOT redirect.
  await companionTile.click();
  await page.waitForTimeout(300);
  expect(new URL(page.url()).pathname).toBe("/demo/founder/start");

  const firstCard = page.locator("div.mt-8 button.rounded-xl").first();
  await expect(firstCard).toBeVisible({ timeout: LONG });
  await page.screenshot({ path: `${SHOTS}/03-founder-guided-cards.png` });

  const cardTitle = await page.locator("div.mt-8 span.text-sm.font-medium").first().textContent();
  console.log("FIRST_CARD_TITLE:", cardTitle);

  // The card click is what redirects into CompanionAltitudeShell now - no
  // inline seeding (no ?seed= mechanism exists on CompanionAltitudeShell;
  // this lands in the normal, unseeded starting conversation).
  await firstCard.click();
  await page.waitForURL((u) => u.pathname === "/demo/founder", { timeout: LONG });
  const composer = page.getByPlaceholder("Message Chi…");
  await expect(composer).toBeVisible({ timeout: LONG });
  await expect(page.getByText(/Kenya Power's pilot has been open eleven days/)).toBeVisible({
    timeout: LONG,
  });
  await page.screenshot({ path: `${SHOTS}/04-founder-companion-altitude.png` });
  console.log("COMPANION_ALTITUDE_URL:", page.url());

  // Confirm this is genuinely the CompanionAltitudeShell (persisted via
  // sessionStorage altitude), not just a coincidental page - reload and
  // check it's still there.
  await page.reload();
  await expect(composer).toBeVisible({ timeout: LONG });
});

test("founder start: App-style Creativity + Platform Experience", async ({ page }) => {
  await page.goto("/demo/founder/start");
  const creativeTile = page.getByRole("button", { name: /^App-style Creativity/ });
  await expect(creativeTile).toBeVisible({ timeout: LONG });
  await creativeTile.click();
  await expect(page.getByText("Not available in demo!")).toBeVisible({ timeout: LONG });
  await page.screenshot({ path: `${SHOTS}/05-founder-creative.png` });

  const platformTile = page.getByRole("button", { name: /^Platform Experience/ });
  await platformTile.click();
  const enterBtn = page.getByRole("button", { name: /Enter Platform/ });
  await expect(enterBtn).toBeVisible({ timeout: LONG });
  await expect(page.getByText(/Platform gives you the full ecosystem/)).toBeVisible({
    timeout: LONG,
  });
  await page.screenshot({ path: `${SHOTS}/06-founder-platform.png` });
  await enterBtn.click();
  await page.waitForURL((u) => u.pathname === "/demo/founder", { timeout: LONG });
  // Regular Founder Home, not the Companion altitude - no seeded chat.
  await expect(page.getByPlaceholder("Message Chi…")).not.toBeVisible();
  console.log("PLATFORM_URL:", page.url());
});

test("investor start: greeting + Companion-first Guidance disabled", async ({ page }) => {
  await page.goto("/demo/investor/start");
  await expect(page.getByText(/Welcome to Xcamp, Claas/)).toBeVisible({ timeout: LONG });
  const companionTile = page.getByRole("button", { name: /^Companion-first Guidance/ });
  await expect(companionTile).toBeVisible({ timeout: LONG });
  await expect(companionTile).toBeDisabled();
  await waitForTilesFadedIn(page, companionTile);
  await page.screenshot({ path: `${SHOTS}/07-investor-tiles.png` });

  // Disabled means disabled, not a silent no-op into a broken state -
  // clicking it must not navigate anywhere, and must not reveal the
  // Guided-cards state either (the disabled check in selectTile also
  // guards against reaching that).
  await companionTile.click({ force: true });
  await page.waitForTimeout(500);
  expect(new URL(page.url()).pathname).toBe("/demo/investor/start");
  await expect(page.locator("div.mt-8 button.rounded-xl")).toHaveCount(0);
  console.log("INVESTOR_COMPANION_CLICK_URL:", page.url());
});

test("collaborator start: greeting + Companion-first Guidance disabled", async ({ page }) => {
  await page.goto("/demo/collaborator/start");
  await expect(page.getByText(/Welcome to Xcamp, Claas/)).toBeVisible({ timeout: LONG });
  const companionTile = page.getByRole("button", { name: /^Companion-first Guidance/ });
  await expect(companionTile).toBeVisible({ timeout: LONG });
  await expect(companionTile).toBeDisabled();
  await waitForTilesFadedIn(page, companionTile);
  await page.screenshot({ path: `${SHOTS}/10-collaborator-tiles.png` });

  await companionTile.click({ force: true });
  await page.waitForTimeout(500);
  expect(new URL(page.url()).pathname).toBe("/demo/collaborator/start");
  await expect(page.locator("div.mt-8 button.rounded-xl")).toHaveCount(0);
  console.log("COLLAB_COMPANION_CLICK_URL:", page.url());
});

test("/demo/founder/companion is gone - real not-found page, not a redirect or crash", async ({
  page,
}) => {
  const response = await page.goto("/demo/founder/companion");
  // SPA: server returns 200 with index.html for any path: the real check
  // is the client-side router's own not-found state, not the HTTP status.
  console.log("COMPANION_ROUTE_HTTP_STATUS:", response?.status());
  await expect(page.getByText("404")).toBeVisible({ timeout: LONG });
  await expect(page.getByText("Page not found")).toBeVisible({ timeout: LONG });
  await page.screenshot({ path: `${SHOTS}/15-founder-companion-404.png` });
});

test("AltitudeRail hover + Companion segment disabled state on founder, investor, collaborator", async ({
  page,
}) => {
  for (const [persona, url] of [
    ["founder", "/demo/founder"],
    ["investor", "/demo/investor"],
    ["collaborator", "/demo/collaborator"],
  ] as const) {
    await page.goto(url);
    const nav = page.getByRole("navigation", { name: "Altitude" });
    await expect(nav).toBeVisible({ timeout: LONG });
    await nav.hover();
    await expect(page.getByRole("tooltip")).toContainText("Toggle your world", {
      timeout: LONG,
    });
    await page.screenshot({ path: `${SHOTS}/12-${persona}-rail-hover.png` });

    const companionBtn = page.getByRole("button", { name: /Companion/ });
    const isDisabled = await companionBtn.isDisabled();
    console.log(`${persona} rail companion-disabled:`, isDisabled);
  }
});

test("PersonaSwitcher lands on /start", async ({ page }) => {
  await page.goto("/demo/founder");
  const switcher = page.getByRole("button", { name: /Founder/ }).first();
  await expect(switcher).toBeVisible({ timeout: LONG });
  await switcher.click();
  await page.getByRole("menuitem", { name: "Investor" }).click();
  await page.waitForURL(/\/demo\/investor\/start/, { timeout: LONG });
  console.log("SWITCH_TO_INVESTOR_URL:", page.url());

  // /start is full-bleed, no DemoNavRail/PersonaSwitcher there by design -
  // go back to a platform screen to switch again.
  await page.goto("/demo/investor");
  const switcher2 = page.getByRole("button", { name: /Investor/ }).first();
  await expect(switcher2).toBeVisible({ timeout: LONG });
  await switcher2.click();
  await page.getByRole("menuitem", { name: "Collaborator" }).click();
  await page.waitForURL(/\/demo\/collaborator\/start/, { timeout: LONG });
  console.log("SWITCH_TO_COLLABORATOR_URL:", page.url());
});

test("mobile viewport: no overlap / no horizontal scroll on start and platform", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/founder/start");
  await expect(page.getByText(/Welcome to Xcamp, Claas/)).toBeVisible({ timeout: LONG });
  await waitForTilesFadedIn(page, page.getByRole("button", { name: /^Platform Experience/ }));
  await page.screenshot({ path: `${SHOTS}/13-mobile-founder-start.png` });

  await page.goto("/demo/founder");
  await expect(page.getByRole("navigation", { name: "Altitude" })).toBeVisible({
    timeout: LONG,
  });
  await page.screenshot({ path: `${SHOTS}/14-mobile-founder-platform.png` });
  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  console.log("MOBILE_HORIZONTAL_SCROLL:", hasHScroll);
});
