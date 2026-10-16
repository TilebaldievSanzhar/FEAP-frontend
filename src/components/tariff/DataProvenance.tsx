import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Database, TriangleAlert } from "lucide-react";

import type { DatasetCheck, FxQuote } from "@/api/refdata";
import { formatBishkek } from "@/api/refdata";
import { formatDecimal, formatIsoDate } from "@/lib/tariff";
import { cn } from "@/lib/utils";

interface Props {
  fx: FxQuote[];
  datasets: DatasetCheck[];
  className?: string;
}

/**
 * «Источник и дата сверки» под суммами: курс НБКР на день (откуда и когда
 * получен) и гарантии справочников. Только отображение — проверки на бэкенде.
 */
export function DataProvenance({ fx, datasets, className }: Props) {
  const { t } = useTranslation();
  const shown = fx.filter((q) => q.source !== "kgs");
  if (!shown.length && !datasets.length) return null;
  // Сверка с ЕЭК — построчно; ручные справочники (подпись эксперта) — одной
  // строкой: подробности в ФЛК W-REF-ATTEST и на странице статуса.
  const eec = datasets.filter((d) => d.guarantee === "eec");
  const attested = datasets.filter((d) => d.guarantee === "attestation");
  const staleAttested = attested.filter((d) => !d.ok);
  const oldest = attested
    .map((d) => d.checked_at)
    .filter((v): v is string => Boolean(v))
    .sort()[0];

  return (
    <div className={cn("flex flex-col gap-1 text-[11.5px] leading-snug text-[var(--text-subtle)]", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-muted)]">
          <Database className="h-3 w-3" /> {t("refdata.title")}
        </span>
        <Link to="/reference/data" className="text-[11px] text-[var(--primary)] hover:underline">
          {t("refdata.statusLink")}
        </Link>
      </div>
      {shown.map((q) => (
        <div key={q.currency} className={cn(q.source === "manual" && "text-[var(--warn-strong)]")}>
          {q.source === "manual"
            ? t("refdata.fxManual", { currency: q.currency, day: formatIsoDate(q.day), rate: formatDecimal(q.rate) })
            : t("refdata.fxLine", {
                currency: q.currency,
                day: formatIsoDate(q.day),
                rate: formatDecimal(q.rate),
                source: t(`refdata.fxSource.${q.source}`, { defaultValue: q.source }),
              })}
          {q.source !== "manual" && q.fetched_at ? (
            <span className="text-[var(--text-faint)]"> · {t("refdata.fetched", { at: formatBishkek(q.fetched_at) })}</span>
          ) : null}
        </div>
      ))}
      {eec.map((d) => (
        <div key={d.dataset} className={cn("flex gap-1.5", !d.ok && "text-[var(--warn-strong)]")}>
          {!d.ok ? <TriangleAlert className="mt-[2px] h-3 w-3 shrink-0" /> : null}
          <span>
            {d.ok
              ? t("refdata.eecOk", {
                  title: d.title,
                  at: formatBishkek(d.checked_at),
                  until: formatIsoDate(d.guaranteed_until),
                })
              : d.message}
          </span>
        </div>
      ))}
      {attested.length ? (
        <div className={cn("flex gap-1.5", staleAttested.length && "text-[var(--warn-strong)]")}>
          {staleAttested.length ? <TriangleAlert className="mt-[2px] h-3 w-3 shrink-0" /> : null}
          <span>
            {staleAttested.length
              ? t("refdata.attestedStale", {
                  list: staleAttested.map((d) => d.title).join(", "),
                })
              : t("refdata.attestedOk", { at: formatIsoDate(oldest) })}
          </span>
        </div>
      ) : null}
    </div>
  );
}
