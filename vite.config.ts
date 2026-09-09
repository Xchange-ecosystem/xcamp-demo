import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Nox by Xcamp",
        short_name: "Nox",
        description: "Your AI founder companion for building extraordinary companies",
        theme_color: "#4de0c1",
        background_color: "#0d1117",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "en",
        icons: [
          {
            src: "icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache all static assets — app-shell only, no API caching
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // ...except the transcript parsers. pdf.js and mammoth are ~2.3 MB of
        // JS between them, lazily imported by /admin/recap's transcript step
        // and by nothing else. Precaching them would put that on the first
        // load of every visitor — most of whom are here for the demo and will
        // never open the Recap admin tool. They still work when needed; they
        // are fetched on demand instead of up front.
        globIgnores: ["**/transcriptPdf-*.js", "**/transcriptDocx-*.js"],
        navigateFallback: "/index.html",
        // Don't intercept API navigation (belt-and-suspenders; APIs are cross-origin anyway)
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
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
