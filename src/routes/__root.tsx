import { useEffect } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { useUiStore } from "@/stores/ui";
import { setLocale as setI18nLocale } from "@/i18n";

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}

function RootLayout() {
  const theme = useUiStore((s) => s.theme);
  const locale = useUiStore((s) => s.locale);
  const { t } = useTranslation();

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    if (locale) setI18nLocale(locale);
  }, [locale]);

  return (
    <TooltipProvider delayDuration={150}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t("header.skipToContent")}
      </a>
      <Outlet />
      <Toaster richColors position="top-right" />
      {import.meta.env.DEV ? (
        <>
          <TanStackRouterDevtools position="bottom-right" />
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </>
      ) : null}
    </TooltipProvider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
