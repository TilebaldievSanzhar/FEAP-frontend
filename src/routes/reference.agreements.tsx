import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check, Info } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHead } from "@/components/layout/PageHead";
import { StatusPill } from "@/components/dt/badges";
import { CountryChip } from "@/components/tariff/CountryChip";
import { Skeleton } from "@/components/ui/skeleton";
import { useTradeAgreements } from "@/api/reference";
import { parseApiError } from "@/lib/errors";
import { formatIsoDate } from "@/lib/tariff";
import { cn } from "@/lib/utils";

/** v3 §6.2 — EAEU free-trade agreements by origin country (read-only reference). */
function AgreementsPage() {
  const { t } = useTranslation();
  const list = useTradeAgreements();
  const rows = (list.data ?? [])
    .slice()
    .sort((a, b) => Number(b.status === "in_force") - Number(a.status === "in_force") || a.country.localeCompare(b.country));

  return (
    <AppShell crumbs={[t("shell.sectionRefs"), t("shell.navAgreements")]}>
      <PageHead
        eyebrow="/reference/agreements · GET /reference/trade-agreements"
        title={t("agreements.title")}
        sub={t("agreements.sub")}
      />

      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2.5 rounded-[var(--r-md)] bg-[var(--bg-muted)] px-3.5 py-2.5 text-[12px] text-[var(--text-subtle)]">
          <Info className="h-[13px] w-[13px] shrink-0" />
          {t("agreements.banner")}
        </div>

        {list.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : list.isError ? (
          <div className="alert alert-warn">
            <div className="text-[12.5px]">{parseApiError(list.error).message}</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] p-8 text-center text-[13px] text-[var(--text-subtle)]">
            {t("agreements.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
            <table className="w-full border-separate border-spacing-0 text-[12.5px]">
              <thead>
                <tr>
                  {[
                    { l: t("agreements.colCountry"), c: "w-[150px]" },
                    { l: t("agreements.colAgreement"), c: "min-w-[260px]" },
                    { l: t("agreements.colStatus"), c: "w-[150px]" },
                    { l: t("agreements.colProof"), c: "w-[260px]" },
                    { l: t("agreements.colVerified"), c: "w-[100px]" },
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
                {rows.map((a) => {
                  const inForce = a.status === "in_force";
                  return (
                    <tr key={`${a.country}-${a.regime}`} className={cn("align-top", !inForce && "text-[var(--text-subtle)]")}>
                      <td className="border-b border-[var(--border)] px-3 py-2.5">
                        <CountryChip code={a.country} mute={!inForce} />
                      </td>
                      <td className="border-b border-[var(--border)] px-3 py-2.5">
                        <div>{a.agreement}</div>
                        <div className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
                          {t(`agreements.regime.${a.regime}`, { defaultValue: a.regime })}
                          {a.note ? ` · ${a.note}` : ""}
                        </div>
                      </td>
                      <td className="border-b border-[var(--border)] px-3 py-2.5">
                        <StatusPill kind={inForce ? "ok" : "mute"}>
                          {t(`agreements.status.${a.status}`, { defaultValue: a.status })}
                        </StatusPill>
                        {a.in_force_from ? (
                          <div className="mt-1 font-mono text-[10.5px] tabular-nums text-[var(--text-subtle)]">
                            {t("agreements.since", { date: formatIsoDate(a.in_force_from) })}
                          </div>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "border-b border-[var(--border)] px-3 py-2.5 text-[12px]",
                          a.origin_proof ? "text-[var(--text-muted)]" : "text-[var(--text-faint)]",
                        )}
                      >
                        {a.origin_proof ?? "—"}
                      </td>
                      <td className="border-b border-[var(--border)] px-3 py-2.5">
                        {a.verified ? (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--success)]">
                            <Check className="h-3 w-3" /> {t("agreements.verifiedYes")}
                          </span>
                        ) : (
                          <span className="text-[11.5px] text-[var(--warn-strong)]">{t("agreements.verifiedNo")}</span>
                        )}
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

export const Route = createFileRoute("/reference/agreements")({
  component: AgreementsPage,
});
