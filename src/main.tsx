import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter, parseSearchWith, stringifySearchWith } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./styles/globals.css";
import { routeTree } from "./routeTree.gen";
import { loadRuntimeConfig } from "./lib/config";
import { initI18n } from "./i18n";
import { useUiStore } from "./stores/ui";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // Search params are flat strings: keep links shareable (/calc?code=7615101000&origin=CN)
  // instead of the default JSON quoting (?code=%227615101000%22). Numeric-looking values
  // come back as numbers — every validateSearch coerces them to strings.
  parseSearch: parseSearchWith(JSON.parse),
  stringifySearch: stringifySearchWith(JSON.stringify),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

async function bootstrap() {
  const config = await loadRuntimeConfig();
  // Prefer previously-selected locale from persisted UI store; fall back to runtime config.
  const savedLocale = useUiStore.getState().locale;
  const initialLocale = savedLocale ?? config.defaultLocale;
  initI18n(initialLocale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = initialLocale;
  }

  const root = document.getElementById("root");
  if (!root) throw new Error("#root not found");

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
