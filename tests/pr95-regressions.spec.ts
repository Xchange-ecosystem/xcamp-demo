import { test, expect, type TestInfo } from "@playwright/test";
import { installLiveHarness, AUTH_STORAGE_KEY, TASK_TITLE } from "./helpers/liveAuth";

const shot = (testInfo: TestInfo, name: string) => testInfo.outputPath(name);

test.describe("PR #95 regression audit — live verification", () => {
  test.beforeEach(async ({ page }) => {
    await installLiveHarness(page);
    page.on("console", (m) => {
      if (m.type() === "error") console.log("[browser error]", m.text());
    });
    page.on("pageerror", (e) => console.log("[page error]", e.message));
  });

  // ── Item 1 — /home shell capabilities ──────────────────────────────────────
  test("item1: /home mounts altitude rail toggle, fullscreen modal and right panel", async ({
    page,
  }, testInfo) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);

    const probe = await page.evaluate(() => ({
      altitudeRailTab: !!document.querySelector('[data-testid="rail-tab-altitude"]'),
      fullscreenModal: !!document.querySelector('[data-testid="task-fullscreen-modal"]'),
      rightPanelSlot: !!document.querySelector('[data-testid="right-panel-slot"]'),
      url: location.pathname + location.search,
    }));
    console.log("ITEM1_PROBE", JSON.stringify(probe));
    await page.screenshot({ path: shot(testInfo, "item1-home.png"), fullPage: false });

    expect(probe.altitudeRailTab, "altitude rail toggle present on /home").toBe(true);
    expect(probe.fullscreenModal, "task fullscreen modal mounted on /home").toBe(true);
    expect(probe.rightPanelSlot, "right panel slot mounted on /home").toBe(true);
  });

  // ── Item 2 — ?ui=v1 escape hatch ───────────────────────────────────────────
  test("item2: ?ui=v1 is sticky and ?ui=reset escapes it", async ({ page }, testInfo) => {
    // Set the trap.
    await page.goto("/home?ui=v1");
    await page.waitForTimeout(1200);
    const trapped = await page.evaluate(
      (k) => ({
        flag: sessionStorage.getItem("xcamp-ui-version"),
        key: k,
      }),
      AUTH_STORAGE_KEY,
    );
    console.log("ITEM2_TRAP_SET", JSON.stringify(trapped));
    expect(trapped.flag).toBe("v1");

    // Confirm stickiness: navigate away with no param, flag survives.
    await page.goto("/home");
    await page.waitForTimeout(1000);
    const sticky = await page.evaluate(() => sessionStorage.getItem("xcamp-ui-version"));
    console.log("ITEM2_STICKY", sticky);
    expect(sticky, "flag persists with no ?ui param — the trap").toBe("v1");

    // Escape hatch: ?ui=reset must clear the flag and land on a clean URL.
    await page.goto("/home?ui=reset");
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => ({
      flag: sessionStorage.getItem("xcamp-ui-version"),
      url: location.pathname + location.search,
    }));
    console.log("ITEM2_AFTER_RESET", JSON.stringify(after));
    expect(after.flag, "?ui=reset clears the sessionStorage flag").toBeNull();
    expect(after.url, "?ui= param stripped from the URL after reset").toBe("/home");
    await page.screenshot({ path: shot(testInfo, "item2-after-reset.png") });
  });

  // ── Item 3 — ?nav=experimental is gone ─────────────────────────────────────
  test("item3: ?nav=experimental changes nothing and is stripped", async ({ page }) => {
    // Compare rendered STRUCTURE, not body text. Text carries async data (the
    // greeting's "1 goal" vs "0 goals" counts) that races the stubbed backend
    // and has nothing to do with ?nav=experimental.
    const snapshot = () =>
      page.evaluate(() => {
        const sig = (sel: string, attr: string) =>
          [...document.querySelectorAll(sel)]
            .map((el) => el.getAttribute(attr) ?? "")
            .sort()
            .join("|");
        return {
          links: sig("a[href]", "href"),
          testids: sig("[data-testid]", "data-testid"),
          landmarks: [...document.querySelectorAll("main, aside, nav, [role=dialog]")]
            .map((el) => el.tagName.toLowerCase())
            .sort()
            .join("|"),
          sidebarButtons: [...document.querySelectorAll('[data-sidebar="sidebar"] button')]
            .map((button) => button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "")
            .sort()
            .join("|"),
          search: location.search,
        };
      });

    // Query-driven lists (objectives, tasks) stream in, so snapshot only once
    // the structure has stopped changing.
    const structure = async (url: string) => {
      await page.goto(url);
      await page.getByTestId("rail-tab-altitude").waitFor({ state: "attached" });
      // The project selector and project-mode controls arrive with the mocked
      // projects query. Wait for them before comparing the two URLs.
      await expect(page.getByText("Audit project", { exact: true }).first()).toBeVisible({
        timeout: 10_000,
      });

      let previous = "";
      let settled!: Awaited<ReturnType<typeof snapshot>>;
      await expect
        .poll(
          async () => {
            const current = await snapshot();
            const key = JSON.stringify(current);
            const stable = key === previous;
            previous = key;
            settled = current;
            return stable;
          },
          { timeout: 20_000, intervals: [500] },
        )
        .toBe(true);
      return settled;
    };

    for (const route of ["/home", "/navigator"]) {
      const plain = await structure(route);
      const withParam = await structure(`${route}?nav=experimental`);
      const identical =
        plain.links === withParam.links &&
        plain.testids === withParam.testids &&
        plain.landmarks === withParam.landmarks &&
        plain.sidebarButtons === withParam.sidebarButtons;
      console.log(`ITEM3_${route}`, JSON.stringify({ search: withParam.search, identical }));

      expect(withParam.links, `${route}: same nav links with ?nav=experimental`).toBe(plain.links);
      expect(withParam.testids, `${route}: same mounted components`).toBe(plain.testids);
      expect(withParam.landmarks, `${route}: same layout landmarks`).toBe(plain.landmarks);
      expect(withParam.sidebarButtons, `${route}: same sidebar controls`).toBe(
        plain.sidebarButtons,
      );
      expect(withParam.search, `${route}: retired query flag removed`).not.toContain("nav=");
    }
  });

  // ── Item 4 — Navigator task → fullscreen in one click ──────────────────────
  test("item4: Navigator task list opens fullscreen in a single click", async ({
    page,
  }, testInfo) => {
    await page.goto("/navigator?view=browser");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: shot(testInfo, "item4-navigator-before.png") });

    await page.getByText("Audit objective").first().click();
    await page.waitForTimeout(1000);

    const taskButton = page.getByRole("button", { name: TASK_TITLE }).first();
    await expect(taskButton).toBeVisible();

    // Click 1 — task row opens the sidepanel.
    await taskButton.click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: shot(testInfo, "item4-01-sidepanel.png") });

    // The fullscreen control must be visible in the header, not behind the kebab.
    const fullscreenBtn = page.getByTestId("sidepanel-open-fullscreen");
    await expect(fullscreenBtn, "fullscreen control visible in panel header").toBeVisible();

    const before = await page.evaluate(() =>
      document.querySelector('[data-testid="task-fullscreen-modal"]')?.getAttribute("data-open"),
    );
    console.log("ITEM4_MODAL_BEFORE", before);
    expect(before, "modal closed before the fullscreen click").toBe("false");

    // Click 2 — a single, visible click straight to fullscreen (was: open kebab,
    // then pick a menu item).
    await fullscreenBtn.click();
    await page.waitForTimeout(900);

    const state = await page.evaluate(() => {
      const modal = document.querySelector(
        '[data-testid="task-fullscreen-modal"]',
      ) as HTMLElement | null;
      return {
        open: modal?.getAttribute("data-open"),
        opacity: modal ? getComputedStyle(modal).opacity : "n/a",
      };
    });
    console.log("ITEM4_AFTER_FULLSCREEN_CLICK", JSON.stringify(state));
    await page.screenshot({ path: shot(testInfo, "item4-02-fullscreen.png") });
    expect(state.open, "fullscreen modal open after a single header click").toBe("true");
    expect(state.opacity, "fullscreen modal actually visible").toBe("1");
  });

  // ── Item 5 — dead component is gone ────────────────────────────────────────
  test("item5: CompanionGlassPanelV2 is absent from the built app", async ({ page }) => {
    await page.goto("/home");
    await page.waitForTimeout(1200);
    const found = await page.evaluate(() => document.body.innerText.includes("V2 experimental"));
    console.log("ITEM5_V2_MARKER_PRESENT", found);
    expect(found, "the component's 'V2 experimental' marker is nowhere in the app").toBe(false);
  });

  // ── Item 6 — skin CSS vars resolve at runtime ──────────────────────────────
  test("item6: --skin-* custom properties resolve on load (light and dark)", async ({
    page,
  }, testInfo) => {
    await page.goto("/home");
    await page.waitForTimeout(1200);

    const read = async () =>
      page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        const names = [
          "--skin-bg",
          "--skin-surface",
          "--skin-ink",
          "--skin-line",
          "--skin-accent",
          "--skin-font-head",
          "--skin-font-body",
          "--skin-radius",
          "--skin-duration",
          "--skin-label-transform",
          "--gravity-bg",
        ];
        const out: Record<string, string> = {};
        for (const n of names) out[n] = cs.getPropertyValue(n).trim();
        return {
          vars: out,
          paradigm: document.documentElement.getAttribute("data-skin-paradigm"),
          tone: document.documentElement.getAttribute("data-skin-tone"),
          dark: document.documentElement.classList.contains("dark"),
        };
      });

    const light = await read();
    console.log("ITEM6_LIGHT", JSON.stringify(light, null, 2));
    for (const [k, v] of Object.entries(light.vars)) {
      expect(v, `${k} resolves in light mode`).not.toBe("");
    }

    // Flip to dark and confirm the dark overrides actually take effect —
    // inline vars written on <html> outrank the .dark stylesheet rules.
    await page.evaluate(() => {
      localStorage.setItem("xcamp-theme", "dark");
    });
    await page.reload();
    await page.waitForTimeout(1200);
    const dark = await read();
    console.log("ITEM6_DARK", JSON.stringify(dark, null, 2));
    expect(dark.dark, "dark class applied").toBe(true);
    for (const [k, v] of Object.entries(dark.vars)) {
      expect(v, `${k} resolves in dark mode`).not.toBe("");
    }
    expect(dark.vars["--skin-ink"], "--skin-ink differs between light and dark").not.toBe(
      light.vars["--skin-ink"],
    );
    await page.screenshot({ path: shot(testInfo, "item6-dark.png") });
  });
});
