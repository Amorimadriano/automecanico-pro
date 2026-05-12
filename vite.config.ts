// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        manifest: false,
        strategies: "generateSW",
        filename: "sw.js",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json}"],
          navigateFallback: "/offline",
          navigateFallbackDenylist: [/^\/_build\//, /^\/api\//],
        },
        devOptions: {
          enabled: true,
          type: "module",
        },
      }),
    ],
  },
});
