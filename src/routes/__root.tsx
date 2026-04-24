import { useEffect } from "react";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { useUiStore } from "@/stores/ui";
import { SUPPORTED_LOCALES, setLocale as setI18nLocale, type Locale } from "@/i18n";

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}

function Header() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, locale, setLocale } = useUiStore();
  const activeLocale = (locale ?? (i18n.language as Locale)) as Locale;

  function onLocaleChange(next: Locale) {
    setLocale(next);
    setI18nLocale(next);
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
            F
          </span>
          <span>{t("app.title")}</span>
          <span className="text-xs text-muted-foreground">{t("app.subtitle")}</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm" aria-label={t("app.title")}>
          <Link
            to="/"
            activeProps={{ className: "text-foreground font-medium" }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
            activeOptions={{ exact: true }}
          >
            {t("app.navClassify")}
          </Link>
          <Link
            to="/document/upload"
            activeProps={{ className: "text-foreground font-medium" }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
          >
            {t("app.navDocument")}
          </Link>
          <Link
            to="/tnved/tree"
            activeProps={{ className: "text-foreground font-medium" }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
          >
            {t("app.navTree")}
          </Link>
          <Link
            to="/ntm/verify"
            activeProps={{ className: "text-foreground font-medium" }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
          >
            {t("app.navNtm")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="locale">
              {t("header.language")}
            </label>
            <select
              id="locale"
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={activeLocale}
              onChange={(e) => onLocaleChange(e.target.value as Locale)}
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc} value={loc}>
                  {t(`header.lang${loc[0].toUpperCase() + loc.slice(1)}` as "header.langRu")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="theme">
              {t("header.theme")}
            </label>
            <select
              id="theme"
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
            >
              <option value="system">{t("header.themeSystem")}</option>
              <option value="light">{t("header.themeLight")}</option>
              <option value="dark">{t("header.themeDark")}</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
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
      <div className="flex min-h-full flex-col">
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>
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
