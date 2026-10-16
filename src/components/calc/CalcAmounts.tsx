import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Loader2, ShieldAlert, TriangleAlert } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { FindingRow } from "@/components/dt/FindingRow";
import { DataProvenance } from "@/components/tariff/DataProvenance";
import type { CalcOut } from "@/api/calc";
import { isRemedyKind } from "@/api/dt-types";
import { parseApiError } from "@/lib/errors";
import { formatDecimal, formatIsoDate, formatMoney, parseRemedyMissing } from "@/lib/tariff";
import { cn } from "@/lib/utils";

interface Props {
  calc: CalcOut | undefined;
  fetching: boolean;
  error: unknown;
  hasPrice: boolean;
  /** Code has trade remedies but the origin is empty — they are not in the sum. */
  originMissing: boolean;
  onResolveRemedy: (measureNo: string) => void;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]", className)}>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  strong,
  accent,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[5px] text-[12.5px]">
      <span className={cn("min-w-0", strong ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]")}>
        {label}
        {sub ? <span className="ml-1.5 font-mono text-[11px] text-[var(--text-faint)]">{sub}</span> : null}
      </span>
      <span
        className={cn(
          "shrink-0 font-mono tabular-nums",
          strong ? "text-[14px] font-semibold" : "text-[var(--text)]",
          accent && "font-semibold text-[var(--warn-strong)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * v3.1 §4 — payments and landed cost from POST /calc. Display only: every
 * number is a backend string; the sums are the backend's sums.
 */
export function CalcAmounts({ calc, fetching, error, hasPrice, originMissing, onResolveRemedy }: Props) {
  const { t } = useTranslation();
  const [linesOpen, setLinesOpen] = useState(false);

  if (!hasPrice) {
    return (
      <Card>
        <div className="border-b border-[var(--border)] px-4 py-3 text-[13px] font-semibold">{t("calc.amountsTitle")}</div>
        <div className="px-4 py-3.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">{t("calc.amountsEnterPrice")}</div>
      </Card>
    );
  }
  if (!calc) {
    return error ? (
      <div className="alert alert-warn">
        <div className="text-[12.5px]">{parseApiError(error).message}</div>
      </div>
    ) : (
      <Skeleton className="h-[260px] w-full" />
    );
  }

  const lc = calc.landed_cost;
  const kindLabel = (kind: string) => t(`draft.pay.${kind}`, { defaultValue: kind });

  return (
    <div className={cn("flex flex-col gap-3 transition-opacity", fetching && "opacity-70")}>
      <Card>
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <span className="text-[13px] font-semibold">{t("calc.paymentsTitle")}</span>
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--text-subtle)]">
            {fetching ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {t("calc.asOf", { date: formatIsoDate(calc.rate_date) })}
            {calc.fx_rate ? ` · ${calc.currency} ${formatDecimal(calc.fx_rate)}` : ""}
          </span>
        </div>
        <div className="px-4 py-2.5">
          <Row label={t("calc.customsValue")} value={formatMoney(calc.customs_value)} />
          <div className="my-1 border-t border-[var(--border)]" />
          {calc.payments.map((p, i) => {
            const remedy = isRemedyKind(p.kind);
            const rate = p.kind === "fee" ? p.rate.split(" от ")[0] : p.rate;
            return (
              <Row
                key={i}
                label={
                  <span className="inline-flex items-center gap-1.5">
                    {remedy ? <ShieldAlert className="h-3 w-3 text-[var(--warn-strong)]" /> : null}
                    {kindLabel(p.kind)}
                    {p.ref && remedy ? <span className="font-mono text-[11px] text-[var(--warn-strong)]">{p.ref}</span> : null}
                  </span>
                }
                sub={rate}
                value={p.amount != null ? formatMoney(p.amount) : <span className="text-[11.5px] text-[var(--warn-strong)]">{t("draft.notComputed")}</span>}
                accent={remedy}
              />
            );
          })}
          <div className="my-1 border-t border-[var(--border)]" />
          <Row
            label={t("calc.paymentsTotal")}
            value={calc.payments_total != null ? `${formatMoney(calc.payments_total)} сом` : "—"}
            strong
          />
          <div className="mt-1 text-[11px] text-[var(--text-faint)]">{t("calc.feePerDeclaration")}</div>
        </div>

        {calc.missing_parameters.length ? (
          <div className="border-t border-[var(--warn-border)] bg-[var(--warn-tint)] px-4 py-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--warn-strong)]">
              <TriangleAlert className="h-3 w-3" /> {t("calc.needsDecision")}
            </div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[11.5px] leading-snug text-[var(--text-muted)]">
              {calc.missing_parameters.map((m, i) => {
                const jump = parseRemedyMissing(m);
                return (
                  <li key={i}>
                    {jump
                      ? jump.kind === "rate"
                        ? t("calc.remedyRateNeeded", { measure: jump.measureNo })
                        : t("calc.remedyQuestion", { measure: jump.measureNo })
                      : m}
                    {jump ? (
                      <button
                        type="button"
                        className="ml-1.5 font-medium text-[var(--primary)] hover:underline"
                        onClick={() => onResolveRemedy(jump.measureNo)}
                      >
                        {t("draft.resolve")} →
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {originMissing ? (
          <div className="border-t border-[var(--border)] px-4 py-2.5 text-[11.5px] text-[var(--text-subtle)]">
            {t("calc.originMissingRemedies")}
          </div>
        ) : null}
        {calc.refdata ? (
          <DataProvenance
            fx={calc.refdata.fx}
            datasets={calc.refdata.datasets}
            className="border-t border-[var(--border)] px-4 py-2.5"
          />
        ) : null}
      </Card>

      {lc ? (
        <div className="rounded-[var(--r-lg)] bg-[var(--text)] px-4 py-4 text-[var(--bg)]">
          <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-widest opacity-50">{t("calc.landedTitle")}</div>
          <div className="font-mono text-[26px] font-semibold tabular-nums tracking-tight">
            {formatMoney(lc.total)} <span className="text-[13px] font-normal opacity-60">сом</span>
          </div>
          {lc.per_unit ? (
            <div className="mt-1 text-[12.5px] opacity-85">
              {t("calc.perUnit", { unit: lc.qty_unit || t("calc.unitDefault") })}{" "}
              <span className="font-mono font-semibold tabular-nums">{formatMoney(lc.per_unit)}</span>
              <span className="opacity-60"> · {t("calc.withoutVat")} </span>
              <span className="font-mono tabular-nums">{formatMoney(lc.per_unit_without_vat)}</span>
            </div>
          ) : (
            <div className="mt-1 text-[11.5px] opacity-60">{t("calc.perUnitNeedsQty")}</div>
          )}
          <div className="mt-2.5 border-t border-[color-mix(in_oklch,var(--bg)_14%,transparent)] pt-2 text-[11.5px] leading-normal opacity-70">
            {t("calc.withoutVatTotal")}{" "}
            <span className="font-mono tabular-nums">{formatMoney(lc.total_without_vat)}</span> ·{" "}
            {t("calc.vatCredit", { vat: formatMoney(lc.vat) })}
          </div>
          <button
            type="button"
            onClick={() => setLinesOpen((v) => !v)}
            aria-expanded={linesOpen}
            className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] opacity-75 hover:opacity-100"
          >
            {linesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {t("calc.landedLines")}
          </button>
          {linesOpen ? (
            <div className="mt-1.5 flex flex-col">
              {lc.lines.map((ln, i) => (
                <div
                  key={i}
                  className="flex justify-between gap-3 border-t border-[color-mix(in_oklch,var(--bg)_14%,transparent)] py-1 text-[12px] opacity-85"
                >
                  <span className="min-w-0">
                    {ln.label}
                    {ln.source_currency ? (
                      <span className="ml-1.5 font-mono text-[10.5px] opacity-60">
                        {formatMoney(ln.source_amount)} {ln.source_currency}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums">{formatMoney(ln.amount)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {calc.findings.length ? (
        <Card>
          <div className="border-b border-[var(--border)] px-4 py-2.5 text-[12.5px] font-semibold">{t("calc.findingsTitle")}</div>
          {calc.findings.map((f, i) => (
            <FindingRow
              key={i}
              rule={f.rule}
              severity={f.severity}
              message={f.message}
              last={i === calc.findings.length - 1}
            />
          ))}
        </Card>
      ) : null}
    </div>
  );
}
