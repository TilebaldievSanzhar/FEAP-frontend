import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ExternalLink, Search } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NtmMeasureCard } from "@/components/ntm/NtmMeasureCard";
import { useNtm } from "@/api/ntm";

function NtmLookupPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [code, setCode] = useState<string | null>(null);

  const { data, isFetching, isError } = useNtm(code);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const clean = query.replace(/\D/g, "");
    if (clean.length < 2) return;
    setCode(clean);
  }

  return (
    <AppShell crumbs={[t("shell.crumbRefs"), t("shell.navNtm")]}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("ntm.lookupTitle")}</h1>
        <p className="mt-1 max-w-[640px] text-sm text-[var(--text-muted)]">
          {t("ntm.lookupDescription")}
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mb-4 flex max-w-md gap-2 rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-4 shadow-[var(--shadow-xs)]"
      >
        <Input
          inputMode="numeric"
          placeholder={t("ntm.codePlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="font-mono"
        />
        <Button type="submit">
          <Search className="h-3.5 w-3.5" />
          {t("ntm.lookupSubmit")}
        </Button>
      </form>

      {code ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between rounded-[var(--r-lg)] border border-[var(--border)] bg-card px-6 py-4 shadow-[var(--shadow-xs)]">
            <div>
              <div className="kicker">{t("ntm.measuresFor")}</div>
              <div className="font-mono text-[20px] font-semibold text-[var(--primary)]">
                {code}
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/tnved/$code" params={{ code }}>
                <ExternalLink className="h-3.5 w-3.5" />
                {t("actions.openInTree")}
              </Link>
            </Button>
          </div>

          {isFetching && !data ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : isError ? (
            <p className="text-sm text-[var(--danger)]">{t("errors.generic")}</p>
          ) : !data?.length ? (
            <p className="text-sm text-[var(--text-muted)]">{t("code.ntmEmpty")}</p>
          ) : (
            data.map((m) => <NtmMeasureCard key={m.id} measure={m} />)
          )}
        </section>
      ) : null}
    </AppShell>
  );
}

export const Route = createFileRoute("/ntm/lookup")({
  component: NtmLookupPage,
});
