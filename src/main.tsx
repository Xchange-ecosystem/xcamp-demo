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
import { initUiVersionFromUrl } from "./lib/uiVersion";
import "./styles.css";

// Resolve ?ui= (enter legacy / escape back out) before the router mounts, so a
// route validator cannot strip the param before the escape hatch has seen it.
initUiVersionFromUrl();

// The experimental navigation became the default in PR #95. Remove its retired
// opt-in flag before the router mounts so old bookmarks have one canonical URL.
const initialUrl = new URL(window.location.href);
if (initialUrl.searchParams.get("nav") === "experimental") {
  initialUrl.searchParams.delete("nav");
  window.history.replaceState(null, "", initialUrl);
}

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
