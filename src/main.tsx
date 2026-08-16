import i18n from "./lib/i18n";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
// NOTE: @xchange/ui does not yet export a `DesignThemeProvider`. The app's own
// ThemeProvider toggles the `.dark` class that the design-system tokens key off,
// so it serves as the outermost theme wrapper. Swap to the design-system
// provider here once it ships.
import { ThemeProvider } from "./lib/theme";
import { PLATFORM_SCIENTIFIC } from "@xchange/ui";
import { applyBaseSkin } from "./lib/skin";
import { initUiVersionFromUrl } from "./lib/uiVersion";
import "./styles.css";

// Publish the default scientific skin's CSS vars before first paint so all
// --skin-* custom properties are defined regardless of which route loads first.
// applyBaseSkin emits them in a cascade layer so styles.css — and in particular
// its .dark overrides — still win. See src/lib/skin.ts.
applyBaseSkin(PLATFORM_SCIENTIFIC);

// Resolve ?ui= (enter legacy / escape back out) before the router mounts, so a
// route validator cannot strip the param before the escape hatch has seen it.
initUiVersionFromUrl();

async function main() {
  if (!i18n.isInitialized) {
    await i18n.init();
  }

  const root = document.getElementById("root")!;
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <ThemeProvider>
        <RouterProvider router={getRouter()} />
      </ThemeProvider>
    </StrictMode>,
  );
}

main();
