import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TreeBrowser } from "@/components/tnved/TreeBrowser";

function TreePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  function onLookup(event: React.FormEvent) {
    event.preventDefault();
    const clean = code.replace(/\D/g, "");
    if (clean.length < 2) return;
    void navigate({ to: "/tnved/$code", params: { code: clean } });
  }

  return (
    <AppShell crumbs={[t("shell.crumbRefs"), t("shell.navTree")]}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("tree.title")}</h1>
        <p className="mt-1 max-w-[640px] text-sm text-[var(--text-muted)]">
          {t("tree.heading")}
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[380px_1fr]">
        <section className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
          <form onSubmit={onLookup} className="relative border-b border-[var(--border)] p-3">
            <Search className="pointer-events-none absolute left-[22px] top-[18px] h-3.5 w-3.5 text-[var(--text-faint)]" />
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder={t("tree.lookupPlaceholder")}
              className="pl-8"
            />
          </form>
          <div className="feap-scroll max-h-[640px] p-2">
            <TreeBrowser />
          </div>
        </section>

        <aside className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-xs)]">
          <div className="kicker mb-2.5">{t("tree.helpTitle")}</div>
          <p className="m-0 text-[13px] text-[var(--text-muted)]">
            {t("tree.helpText")}
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              inputMode="numeric"
              placeholder={t("tree.lookupPlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="button" onClick={onLookup}>
              <Search className="h-3.5 w-3.5" />
              {t("tree.open")}
            </Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/tnved/tree")({
  component: TreePage,
});
