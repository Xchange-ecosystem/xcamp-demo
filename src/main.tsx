import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
// NOTE: @xchange/ui does not yet export a `DesignThemeProvider`. The app's own
// ThemeProvider toggles the `.dark` class that the design-system tokens key off,
// so it serves as the outermost theme wrapper. Swap to the design-system
// provider here once it ships.
import { ThemeProvider } from "./lib/theme";

import "./styles.css";

const router = getRouter();

const rootElement = document.getElementById("root")!;

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
