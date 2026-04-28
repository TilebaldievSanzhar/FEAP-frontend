import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Copy, Link as LinkIcon } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { useCodeLookup } from "@/api/tnved";
import { ClassificationChain } from "@/components/classify/ClassificationChain";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NtmSummaryCard } from "@/components/tnved/NtmSummaryCard";
import { formatRate } from "@/lib/format";

function CodePage() {
  const { code } = Route.useParams();
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCodeLookup(code);

  if (isLoading) {
    return (
      <AppShell crumbs={[t("shell.crumbRefs"), t("shell.navTree")]}>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppShell>
    );
  }

  if (isError || !data) {
    return (
      <AppShell crumbs={[t("shell.crumbRefs"), t("shell.navTree")]}>
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-xs)]">
          <h1 className="mb-2 text-lg font-semibold">{t("code.notFound")}</h1>
          <p className="text-sm text-[var(--text-muted)]">{t("errors.generic")}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      crumbs={[
        t("shell.crumbRefs"),
        t("shell.navTree"),
        data.code_formatted ?? data.code,
      ]}
    >
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("tree.title")}</h1>
      </header>

      <section className="mb-4 rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
        <div className="grid grid-cols-[auto_1px_1fr_auto] items-center gap-6 px-6 py-5">
          <div>
            <div className="kicker">{t("code.codeLabel")}</div>
            <div className="font-mono text-[26px] font-semibold tracking-tight text-[var(--primary)]">
              {data.code_formatted ?? data.code}
            </div>
          </div>
          <div className="h-12 w-px bg-[var(--border)]" />
          <div>
            <div className="mb-1.5 text-[15px] font-medium">{data.name}</div>
            {data.chain?.length ? (
              <ClassificationChain chain={data.chain} className="text-[12px]" />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(data.code)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" variant="outline">
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="stat">
          <span className="label">{t("result.duty")}</span>
          <div className="val">{formatRate(data.duty_rate)}</div>
          <span className="text-[11.5px] text-[var(--text-subtle)]">
            {t("code.dutyHint")}
          </span>
        </div>
        <div className="stat">
          <span className="label">{t("result.vat")}</span>
          <div className="val">{formatRate(data.vat_rate)}</div>
          <span className="text-[11.5px] text-[var(--text-subtle)]">
            {t("code.vatHint")}
          </span>
        </div>
        <div className="stat">
          <span className="label">{t("result.excise")}</span>
          <div className="val" style={{ color: data.excise_rate ? undefined : "var(--text-faint)" }}>
            {data.excise_rate ? formatRate(data.excise_rate) : "—"}
          </div>
          <span className="text-[11.5px] text-[var(--text-subtle)]">
            {data.excise_rate ? t("code.exciseApplies") : t("code.exciseNone")}
          </span>
        </div>
        <div className="stat">
          <span className="label">{t("code.ntmCount")}</span>
          <div className="val">{data.ntm_measures?.length ?? 0}</div>
          <span className="text-[11.5px] text-[var(--text-subtle)]">{t("code.ntmHint")}</span>
        </div>
      </section>

      <NtmSummaryCard measures={data.ntm_measures} />

      <section className="mt-4 rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-xs)]">
        <div className="kicker mb-2.5">{t("code.notesTitle")}</div>
        <ol className="m-0 list-decimal pl-4 text-[12.5px] leading-7 text-[var(--text-muted)]">
          <li>{t("code.note1")}</li>
          <li>{t("code.note2")}</li>
        </ol>
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-[var(--text-subtle)]">
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
          {t("code.notesOk")}
        </div>
      </section>
    </AppShell>
  );
}

export const Route = createFileRoute("/tnved/$code")({
  component: CodePage,
});
