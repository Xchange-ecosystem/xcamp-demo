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
import { applySkin, PLATFORM_SCIENTIFIC } from "@xchange/ui";
import "./styles.css";

// Apply the default scientific skin CSS vars to :root before first paint so
// all --skin-* custom properties are defined regardless of which route loads first.
applySkin(PLATFORM_SCIENTIFIC);

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
