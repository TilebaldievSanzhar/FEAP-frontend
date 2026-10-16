import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ExternalLink, Info, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHead } from "@/components/layout/PageHead";
import { StatusPill } from "@/components/dt/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBishkek, useDataStatus, type DataStatusEntry } from "@/api/refdata";
import { parseApiError } from "@/lib/errors";
import { formatIsoDate } from "@/lib/tariff";
import { cn } from "@/lib/utils";

type Kind = "ok" | "warn" | "danger" | "mute";

function pill(e: DataStatusEntry): { kind: Kind; label: string } {
  if (e.status === "failing") return { kind: "danger", label: "failing" };
  if (e.guarantee === "attestation") return e.ok ? { kind: "ok", label: "attested" } : { kind: "warn", label: "notAttested" };
  if (e.status === "unknown") return { kind: "mute", label: "unknown" };
  return e.ok ? { kind: "ok", label: "ok" } : { kind: "warn", label: "stale" };
}

/** Последняя сверка: для курсов/ЕЭК — когда сверились, для ручных — подпись эксперта. */
function CheckedCell({ e }: { e: DataStatusEntry }) {
  const { t } = useTranslation();
  if (e.guarantee === "attestation") {
    return e.attested_at ? (
      <>
        <div className="font-mono tabular-nums">{formatIsoDate(e.attested_at)}</div>
        {e.attested_by ? <div className="mt-0.5 text-[11px] text-[var(--text-subtle)]">{e.attested_by}</div> : null}
      </>
    ) : (
      <span className="text-[var(--text-faint)]">{t("dataStatus.never")}</span>
    );
  }
  return e.last_success_at ? (
    <>
      <div className="font-mono tabular-nums">{formatBishkek(e.last_success_at, true)}</div>
      {e.last_attempt_at && e.last_attempt_at !== e.last_success_at && e.status === "failing" ? (
        <div className="mt-0.5 text-[11px] text-[var(--danger)]">
          {t("dataStatus.lastAttempt", { at: formatBishkek(e.last_attempt_at) })}
        </div>
      ) : null}
    </>
  ) : (
    <span className="text-[var(--text-faint)]">{t("dataStatus.never")}</span>
  );
}

function GuaranteeCell({ e }: { e: DataStatusEntry }) {
  const { t } = useTranslation();
  if (e.guarantee === "fx") {
    return (
      <span>
        {e.publication_date ? t("dataStatus.fxPublication", { date: formatIsoDate(e.publication_date) }) : "—"}
      </span>
    );
  }
  if (e.guarantee === "eec") {
    return e.guaranteed_until ? (
      <span>{t("dataStatus.eecUntil", { date: formatIsoDate(e.guaranteed_until) })}</span>
    ) : (
      <span className="text-[var(--warn-strong)]">{t("dataStatus.eecNone")}</span>
    );
  }
  if (e.guarantee === "attestation") return <span>{t("dataStatus.attestationRule")}</span>;
  return <span className="text-[var(--text-faint)]">—</span>;
}

/** «Источник и дата сверки» — когда и откуда обновлялись справочники, на которых держатся суммы. */
function DataStatusPage() {
  const { t } = useTranslation();
  const status = useDataStatus();
  const rows = status.data?.datasets ?? [];

  return (
    <AppShell crumbs={[t("shell.sectionRefs"), t("shell.navDataStatus")]}>
      <PageHead
        eyebrow="/reference/data · GET /reference/data-status"
        title={t("dataStatus.title")}
        sub={t("dataStatus.sub")}
      />

      <div className="flex flex-col gap-3.5">
        <div className="flex items-start gap-2.5 rounded-[var(--r-md)] bg-[var(--bg-muted)] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--text-subtle)]">
          <Info className="mt-[2px] h-[13px] w-[13px] shrink-0" />
          <span>{t("dataStatus.banner")}</span>
        </div>

        {status.data?.pending_changes ? (
          <div className="alert alert-warn">
            <TriangleAlert className="h-3.5 w-3.5" />
            <div className="text-[12.5px]">{t("dataStatus.pending", { n: status.data.pending_changes })}</div>
          </div>
        ) : null}

        {status.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : status.isError ? (
          <div className="alert alert-warn">
            <div className="text-[12.5px]">{parseApiError(status.error).message}</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
            <table className="w-full border-separate border-spacing-0 text-[12.5px]">
              <thead>
                <tr>
                  {[
                    { l: t("dataStatus.colDataset"), c: "min-w-[260px]" },
                    { l: t("dataStatus.colCadence"), c: "w-[170px]" },
                    { l: t("dataStatus.colChecked"), c: "w-[170px]" },
                    { l: t("dataStatus.colStatus"), c: "w-[150px]" },
                    { l: t("dataStatus.colGuarantee"), c: "min-w-[220px]" },
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        "whitespace-nowrap border-b border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-subtle)]",
                        h.c,
                      )}
                    >
                      {h.l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const p = pill(e);
                  const note = e.status === "failing" ? e.last_error : e.warning;
                  return (
                    <tr key={e.dataset} className="align-top">
                      <td className="border-b border-[var(--border)] px-3 py-2.5">
                        <div className="font-medium">{e.title}</div>
                        <div className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
                          {e.source}
                          {e.source_url ? (
                            <a
                              href={e.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-1 inline-flex items-center text-[var(--primary)] hover:underline"
                              aria-label={t("dataStatus.openSource")}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="border-b border-[var(--border)] px-3 py-2.5 text-[12px] text-[var(--text-muted)]">
                        {e.cadence}
                      </td>
                      <td className="border-b border-[var(--border)] px-3 py-2.5 text-[12px]">
                        <CheckedCell e={e} />
                      </td>
                      <td className="border-b border-[var(--border)] px-3 py-2.5">
                        <StatusPill kind={p.kind}>{t(`dataStatus.status.${p.label}`)}</StatusPill>
                      </td>
                      <td className="border-b border-[var(--border)] px-3 py-2.5 text-[12px] text-[var(--text-muted)]">
                        <GuaranteeCell e={e} />
                        {e.detail ? <div className="mt-1 text-[11px] text-[var(--text-subtle)]">{e.detail}</div> : null}
                        {note ? (
                          <div className={cn("mt-1 text-[11px]", e.status === "failing" ? "text-[var(--danger)]" : "text-[var(--warn-strong)]")}>
                            {note}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/reference/data")({
  component: DataStatusPage,
});
