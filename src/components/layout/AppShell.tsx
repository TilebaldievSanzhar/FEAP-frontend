import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Bell,
  ChevronRight,
  FileText,
  FlaskConical,
  Search,
  Shield,
  Sparkles,
  Network,
} from "lucide-react";
import { useUiStore } from "@/stores/ui";
import { SUPPORTED_LOCALES, setLocale as setI18nLocale, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof Sparkles;
  matchPrefix?: string;
}

interface NavGroup {
  sectionKey: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    sectionKey: "shell.sectionWork",
    items: [
      { to: "/", labelKey: "shell.navClassify", icon: Sparkles },
      { to: "/document/upload", labelKey: "shell.navDocuments", icon: FileText, matchPrefix: "/document" },
    ],
  },
  {
    sectionKey: "shell.sectionRefs",
    items: [
      { to: "/tnved/tree", labelKey: "shell.navTree", icon: Network, matchPrefix: "/tnved" },
      { to: "/ntm/verify", labelKey: "shell.navNtm", icon: Shield, matchPrefix: "/ntm" },
    ],
  },
];

interface Props {
  crumbs?: string[];
  children: React.ReactNode;
}

export function AppShell({ crumbs = [], children }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, locale, setLocale } = useUiStore();
  const activeLocale = (locale ?? (i18n.language as Locale)) as Locale;
  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <div className="grid h-full grid-cols-[240px_1fr] bg-[var(--bg)]">
      <aside className="feap-sidebar flex flex-col gap-1 px-3 py-4 overflow-hidden">
        <Link to="/" className="flex items-center gap-2.5 px-2 pb-4 pt-1.5 no-underline">
          <span className="grid h-7 w-7 place-items-center rounded-[7px] bg-[var(--primary)] text-[13px] font-bold tracking-tight text-white">
            FE
          </span>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              {t("app.title")}
            </span>
            <span className="-mt-0.5 text-[11px] text-[var(--text-subtle)]">
              {t("app.subtitle")}
            </span>
          </div>
        </Link>

        {NAV.map((group) => (
          <div key={group.sectionKey} className="flex flex-col gap-0.5">
            <div className="nav-section-label">{t(group.sectionKey)}</div>
            {group.items.map((it) => {
              const matchedPrefix = it.matchPrefix
                ? path.startsWith(it.matchPrefix)
                : path === it.to;
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn("nav-link no-underline", matchedPrefix && "active")}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{t(it.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <div className="flex-1" />

        <div className="mt-2 flex flex-col gap-2 border-t border-[var(--border)] px-2 pt-3 text-[11.5px] text-[var(--text-subtle)]">
          <div className="flex items-center gap-1.5">
            <select
              aria-label={t("header.language")}
              className="h-6 rounded border border-[var(--border)] bg-transparent px-1 text-[11px]"
              value={activeLocale}
              onChange={(e) => {
                const next = e.target.value as Locale;
                setLocale(next);
                setI18nLocale(next);
              }}
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc} value={loc}>
                  {t(`header.lang${loc[0].toUpperCase() + loc.slice(1)}` as "header.langRu")}
                </option>
              ))}
            </select>
            <select
              aria-label={t("header.theme")}
              className="h-6 rounded border border-[var(--border)] bg-transparent px-1 text-[11px]"
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
            >
              <option value="system">{t("header.themeSystem")}</option>
              <option value="light">{t("header.themeLight")}</option>
              <option value="dark">{t("header.themeDark")}</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="dot dot-success" />
            <span>{t("shell.apiOnline")}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[var(--bg)] px-6">
          {crumbs.length > 0 ? (
            <nav className="flex items-center gap-1.5 text-[13px] text-[var(--text-subtle)]">
              {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 ? <ChevronRight className="h-3 w-3 text-[var(--text-faint)]" /> : null}
                  <span className={i === crumbs.length - 1 ? "font-medium text-[var(--text)]" : ""}>
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
          ) : null}

          <div className="relative ml-auto w-full max-w-[420px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-faint)]" />
            <input
              placeholder={t("shell.searchPlaceholder")}
              className="h-8 w-full rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-subtle)] pl-8 pr-12 text-[13px] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--primary)] focus:bg-[var(--bg)] focus:shadow-[0_0_0_3px_var(--primary-tint-strong)]"
            />
            <span className="absolute right-2 top-1.5 rounded border border-[var(--border)] bg-[var(--bg-muted)] px-1 py-0.5 font-mono text-[10.5px] text-[var(--text-faint)]">
              ⌘K
            </span>
          </div>

          <button
            aria-label="notifications"
            className="grid h-8 w-8 place-items-center rounded-[var(--r-md)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
          >
            <Bell className="h-4 w-4" />
          </button>

          <div
            className="flex items-center gap-1.5 rounded-full border border-[var(--warn-border)] bg-[var(--warn-tint)] px-2.5 py-1 text-[12px] font-medium text-[var(--warn-strong)]"
            title={t("shell.testModeHint")}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            {t("shell.testMode")}
          </div>
        </header>

        <main className="feap-scroll flex-1 overflow-auto px-10 pb-20 pt-8">{children}</main>
      </div>
    </div>
  );
}
