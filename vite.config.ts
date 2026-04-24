import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Same-origin proxy for dev so the browser never sees CORS. Mirrors the
    // nginx setup used in the production image.
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
        ws: false,
      },
    },
  },
  build: {
    // Chunk budget: keep initial JS ≤ ~250 KB gzip. Per-route chunks are produced
    // by TanStack Router plugin; here we pin the heaviest vendors so React/Query
    // caches well across routes.
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-dom") || id.includes("/react/")) return "react";
          if (id.includes("@tanstack/react-router")) return "router";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("i18next") || id.includes("react-i18next")) return "i18n";
          if (id.includes("sonner")) return "sonner";
          if (id.includes("zod") || id.includes("react-hook-form") || id.includes("@hookform")) {
            return "forms";
          }
          return undefined;
        },
      },
    },
  },
});
