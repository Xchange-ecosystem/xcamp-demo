import { test, expect } from "@playwright/test";

const SHOTS =
  "/tmp/claude-0/-home-user-xcamp-demo/e9616883-e38a-5227-b847-bcfd567f7a38/scratchpad/shots";
const LONG = 30000;

test.use({ viewport: { width: 1440, height: 900 } });

test("founder start: logo -> greeting -> tiles -> guided -> companion seed", async ({ page }) => {
  await page.goto("/demo/founder/start");
  await expect(page.getByText(/Welcome to Xcamp, Maren/)).toBeVisible({ timeout: LONG });
  await page.screenshot({ path: `${SHOTS}/01-founder-greeting.png` });

  const guidedTile = page.getByRole("button", { name: /^Guided/ });
  await expect(guidedTile).toBeVisible({ timeout: LONG });
  await expect(page.getByRole("button", { name: /^Creative/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Broad/ })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/02-founder-tiles.png` });

  await guidedTile.click();
  const firstCard = page.locator("div.mt-8 button.rounded-xl").first();
  await expect(firstCard).toBeVisible({ timeout: LONG });
  await page.screenshot({ path: `${SHOTS}/03-founder-guided-cards.png` });

  const cardTitle = await page
    .locator("div.mt-8 span.text-sm.font-medium")
    .first()
    .textContent();
  console.log("FIRST_CARD_TITLE:", cardTitle);

  await firstCard.click();
  await page.waitForURL(/\/demo\/founder\/companion/, { timeout: LONG });
  await page.screenshot({ path: `${SHOTS}/04-founder-companion-seed.png` });

  const details = page.locator("aside");
  await expect(details).toBeVisible({ timeout: LONG });
  const detailsText = await details.textContent();
  console.log("DETAILS_TEXT:", detailsText);
  console.log("URL:", page.url());
});

test("founder start: creative + broad", async ({ page }) => {
  await page.goto("/demo/founder/start");
  const creativeTile = page.getByRole("button", { name: /^Creative/ });
  await expect(creativeTile).toBeVisible({ timeout: LONG });
  await creativeTile.click();
  await expect(page.getByText("Not available in demo!")).toBeVisible({ timeout: LONG });
  await page.screenshot({ path: `${SHOTS}/05-founder-creative.png` });

  const broadTile = page.getByRole("button", { name: /^Broad/ });
  await broadTile.click();
  const enterBtn = page.getByRole("button", { name: /Enter Platform/ });
  await expect(enterBtn).toBeVisible({ timeout: LONG });
  await page.screenshot({ path: `${SHOTS}/06-founder-broad.png` });
  await enterBtn.click();
  await page.waitForURL((u) => u.pathname === "/demo/founder", { timeout: LONG });
  console.log("BROAD_URL:", page.url());
});

test("investor start: guided fallback to portfolio", async ({ page }) => {
  await page.goto("/demo/investor/start");
  await expect(page.getByText(/Welcome to Xcamp, Ingrid/)).toBeVisible({ timeout: LONG });
  const guidedTile = page.getByRole("button", { name: /^Guided/ });
  await expect(guidedTile).toBeVisible({ timeout: LONG });
  await guidedTile.click();
  await page.screenshot({ path: `${SHOTS}/07-investor-tiles.png` });

  const firstCard = page.locator("div.mt-8 button.rounded-xl").first();
  await expect(firstCard).toBeVisible({ timeout: LONG });
  await page.screenshot({ path: `${SHOTS}/08-investor-guided-cards.png` });

  await firstCard.click();
  await page.waitForURL((u) => u.pathname === "/demo/investor/", { timeout: LONG });
  console.log("INVESTOR_FALLBACK_URL:", page.url());
  await page.screenshot({ path: `${SHOTS}/09-investor-fallback-landed.png` });
});

test("collaborator start: guided fallback to assignments", async ({ page }) => {
  await page.goto("/demo/collaborator/start");
  await expect(page.getByText(/Welcome to Xcamp, Yuki/)).toBeVisible({ timeout: LONG });
  const guidedTile = page.getByRole("button", { name: /^Guided/ });
  await expect(guidedTile).toBeVisible({ timeout: LONG });
  await guidedTile.click();
  await page.screenshot({ path: `${SHOTS}/10-collaborator-tiles.png` });

  const firstCard = page.locator("div.mt-8 button.rounded-xl").first();
  await expect(firstCard).toBeVisible({ timeout: LONG });
  await firstCard.click();
  await page.waitForURL((u) => u.pathname === "/demo/collaborator", { timeout: LONG });
  console.log("COLLAB_FALLBACK_URL:", page.url());
  await page.screenshot({ path: `${SHOTS}/11-collaborator-fallback-landed.png` });
});

test("AltitudeRail hover + spacing on founder, investor, collaborator", async ({ page }) => {
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
    console.log(`${persona} companion-disabled:`, isDisabled);
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

  // /start is full-bleed, no DemoNavRail/PersonaSwitcher there by design —
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
  await expect(page.getByRole("button", { name: /^Broad/ })).toBeVisible({ timeout: LONG });
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
