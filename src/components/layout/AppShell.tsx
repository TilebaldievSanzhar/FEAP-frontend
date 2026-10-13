import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Check,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  FlaskConical,
  FolderOpen,
  LogOut,
  Network,
  Scale,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useUiStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { useMe, useSwitchOrg } from "@/api/auth-api";
import { parseApiError } from "@/lib/errors";
import { SUPPORTED_LOCALES, setLocale as setI18nLocale, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof Sparkles;
  matchPrefix?: string;
  isNew?: boolean;
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
      { to: "/declarations", labelKey: "shell.navDeclarations", icon: Scale, matchPrefix: "/declarations", isNew: true },
      { to: "/catalog", labelKey: "shell.navCatalog", icon: FolderOpen, matchPrefix: "/catalog", isNew: true },
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

function initials(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

function AccountBlock() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token, account, org, setSession, clearSession } = useAuthStore();
  const me = useMe(Boolean(token));
  const switchOrg = useSwitchOrg();
  const [open, setOpen] = useState(false);

  if (!token || !account || !org) {
    return (
      <div className="flex flex-col gap-2 border-t border-[var(--border)] px-3 pt-3">
        <div
          className="flex items-center gap-1.5 rounded-[var(--r-md)] bg-[var(--warn-tint)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--warn-strong)]"
          title={t("shell.testModeHint")}
        >
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
          {t("shell.testMode")}
        </div>
        <Link
          to="/login"
          className="rounded-[var(--r-md)] px-2.5 py-1.5 text-center text-[12.5px] font-medium text-[var(--primary)] no-underline hover:bg-[var(--primary-tint)]"
        >
          {t("auth.loginTitle")}
        </Link>
      </div>
    );
  }

  const orgs = me.data?.orgs ?? [];
  const displayName = account.name || account.email;

  async function onSwitch(orgId: string) {
    if (orgId === org?.id) {
      setOpen(false);
      return;
    }
    try {
      const session = await switchOrg.mutateAsync(orgId);
      setSession(session);
      setOpen(false);
      toast.success(t("shell.orgSwitched", { org: session.org.name }));
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  function onLogout() {
    clearSession();
    setOpen(false);
    void navigate({ to: "/login" });
  }

  return (
    <div className="relative border-t border-[var(--border)] px-2 pt-2">
      {open ? (
        <>
          <button
            type="button"
            aria-label="close"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-2 right-2 z-20 mb-1 flex flex-col rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))] py-1 shadow-[var(--shadow-lg)]">
            <div className="px-3 py-2">
              <div className="truncate text-[12.5px] font-medium">{displayName}</div>
              <div className="truncate text-[11px] text-[var(--text-subtle)]">{account.email}</div>
            </div>
            <div className="mx-3 border-t border-[var(--border)]" />
            <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              {t("shell.orgs")}
            </div>
            {(orgs.length ? orgs : [org]).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => void onSwitch(o.id)}
                className="mx-1 flex items-center gap-2 rounded-[var(--r-md)] px-2 py-1.5 text-left text-[12.5px] hover:bg-[var(--bg-muted)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.name}</span>
                  <span className="block font-mono text-[10.5px] text-[var(--text-subtle)]">{o.role}</span>
                </span>
                {o.id === org.id ? <Check className="h-3.5 w-3.5 text-[var(--primary)]" /> : null}
              </button>
            ))}
            <div className="mx-3 my-1 border-t border-[var(--border)]" />
            <button
              type="button"
              onClick={onLogout}
              className="mx-1 flex items-center gap-2 rounded-[var(--r-md)] px-2 py-1.5 text-left text-[12.5px] text-[var(--danger)] hover:bg-[var(--danger-tint)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("shell.logout")}
            </button>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-2 py-2 text-left hover:bg-[var(--bg-muted)]"
      >
        <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--border-strong)] to-[var(--text-faint)] text-[11px] font-semibold text-white">
          {initials(displayName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium">{displayName}</span>
          <span className="block truncate text-[10.5px] text-[var(--text-subtle)]">
            {org.name} · {org.role}
          </span>
        </span>
        <ChevronsUpDown className="h-3 w-3 shrink-0 text-[var(--text-faint)]" />
      </button>
    </div>
  );
}

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
      <aside className="flex flex-col overflow-hidden border-r border-[var(--border)] bg-[hsl(var(--card))]">
        <Link
          to="/"
          className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3.5 no-underline"
        >
          <span className="grid h-[22px] w-[22px] place-items-center rounded-[var(--r-sm)] bg-[var(--text)] font-mono text-[11px] font-semibold text-[var(--bg)]">
            F
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-[var(--text)]">
            {t("app.title")}
          </span>
          <span className="font-mono text-[11px] text-[var(--text-faint)]">v2</span>
        </Link>

        <div className="flex flex-1 flex-col gap-4 overflow-auto px-2.5 py-3">
          {NAV.map((group) => (
            <div key={group.sectionKey} className="flex flex-col gap-0.5">
              <div className="eyebrow px-2 pb-1.5">{t(group.sectionKey)}</div>
              {group.items.map((it) => {
                const active = it.matchPrefix ? path.startsWith(it.matchPrefix) : path === it.to;
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[var(--r-md)] px-2 py-[7px] text-[13px] no-underline",
                      active
                        ? "bg-[var(--text)] font-medium text-[var(--bg)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active ? "text-[var(--bg)]" : "text-[var(--text-subtle)]",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{t(it.labelKey)}</span>
                    {it.isNew ? (
                      <span
                        className={cn(
                          "rounded-[var(--r-sm)] px-1.5 py-px font-mono text-[9px] font-semibold",
                          active
                            ? "bg-white/15 text-[var(--bg)]"
                            : "bg-[var(--primary-tint)] text-[var(--primary)]",
                        )}
                      >
                        NEW
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pb-3">
          <div className="flex items-center gap-1.5 px-4">
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
          <AccountBlock />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col overflow-hidden">
        <header className="flex h-[52px] flex-shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[hsl(var(--card))] px-6">
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
        </header>

        <main id="main-content" className="feap-scroll flex-1 overflow-auto px-8 pb-20 pt-7">
          {children}
        </main>
      </div>
    </div>
  );
}
