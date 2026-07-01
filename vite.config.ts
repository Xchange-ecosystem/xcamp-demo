import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  resolve: {
    alias: {
      "@xchange/companion": path.resolve(__dirname, "vendor/companion/src/index.ts"),
      "@xchange/client": path.resolve(__dirname, "vendor/client/src/index.ts"),
      "@xchange/ui": path.resolve(__dirname, "vendor/ui/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      treeshake: {
        moduleSideEffects: ["./src/lib/i18n.ts"],
      },
    },
  },
});
