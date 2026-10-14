import { forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, FileText, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRemedyKindLabel } from "@/components/tariff/useRemedyKindLabel";
import type { RemedyDecision, RemedyDecisionKind } from "@/api/dt-types";
import type { TradeRemedy } from "@/api/types";
import {
  countryName,
  formatPct,
  previewRemedyRate,
  producerMatches,
  remedyProducers,
  remedyRateSummary,
  remedyVariants,
} from "@/lib/tariff";
import { cn } from "@/lib/utils";

const OPTIONS: RemedyDecisionKind[] = ["applies", "not_applicable", "exempt"];
const OTHER = "__other__";

/** «21,89» → "21.89"; drops letters and extra dots so the backend Decimal (0–500) parses. */
function cleanRate(raw: string): string | null {
  const [int, ...frac] = raw.replace(/,/g, ".").replace(/[^\d.]/g, "").split(".");
  const value = frac.length ? `${int.slice(0, 3)}.${frac.join("").slice(0, 4)}` : int.slice(0, 3);
  return /\d/.test(value) ? value : null;
}

interface Props {
  measure: TradeRemedy;
  origin: string | null;
  value: RemedyDecision | undefined;
  manufacturer: string | null | undefined;
  onChange: (next: RemedyDecision | undefined) => void;
  onManufacturerChange: (next: string | null) => void;
  /** Focus ring — set when reached from «Не хватает данных». */
  focus?: boolean;
  readOnly?: boolean;
  onGoToDocs?: () => void;
}

/**
 * §4.1 — the declarant's decision on a trade remedy for one shipment item.
 * Without a decision the DT draft stays needs_input and the duty is not charged.
 */
export const RemedyDecisionCard = forwardRef<HTMLDivElement, Props>(function RemedyDecisionCard(
  { measure: m, origin, value, manufacturer, onChange, onManufacturerChange, focus, readOnly, onGoToDocs },
  ref,
) {
  const { t, i18n } = useTranslation();
  const kindLabel = useRemedyKindLabel();
  const [descOpen, setDescOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(Boolean(value?.rate_pct));

  const producers = remedyProducers(m, origin);
  const variants = remedyVariants(m, origin);
  const matchedProducer = producers.find((p) => producerMatches(manufacturer, p)) ?? null;
  const preview = previewRemedyRate(m, { origin, manufacturer, variant: value?.variant });
  const desc = m.product_description ?? "";
  const shortDesc = desc.length > 140 && !descOpen ? `${desc.slice(0, 140).trimEnd()}…` : desc;

  function patch(next: Partial<RemedyDecision>) {
    const base: RemedyDecision = value ?? { decision: "applies" };
    onChange({ ...base, ...next });
  }

  return (
    <div
      ref={ref}
      id={`remedy-${m.measure_no}`}
      className={cn(
        "overflow-hidden rounded-[var(--r-lg)] border bg-[hsl(var(--card))] transition-shadow",
        focus
          ? "border-[var(--warn)] shadow-[0_0_0_3px_var(--warn-tint)]"
          : "border-[var(--border)]",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 bg-[var(--warn-tint)] px-3.5 py-[11px]">
        <ShieldAlert className="h-3.5 w-3.5 text-[var(--warn-strong)]" />
        <span className="font-mono text-[12.5px] font-semibold">{m.measure_no}</span>
        <span className="text-[12.5px] font-medium">
          · {kindLabel(m.kind)}
          {origin ? ` · ${countryName(origin, i18n.language)}` : ""}
        </span>
        <span className="ml-auto font-mono text-[13px] font-semibold tabular-nums text-[var(--warn-strong)]">
          {remedyRateSummary(m, origin)}
        </span>
      </div>

      <div className="flex flex-col gap-3 px-3.5 py-3">
        {desc ? (
          <div className="text-[12px] leading-normal text-[var(--text-muted)]">
            <span className="text-[var(--text-subtle)]">{t("tariff.measureCovers")}</span> {shortDesc}{" "}
            {desc.length > 140 ? (
              <button
                type="button"
                className="text-[var(--primary)] hover:underline"
                onClick={() => setDescOpen((v) => !v)}
              >
                {descOpen ? t("tariff.less") : t("tariff.more")}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="text-[12px] text-[var(--text-muted)]">«{m.title}»</div>
        )}

        <div className="text-[13px] font-semibold">{t("tariff.decisionQuestion")}</div>

        <div role="radiogroup" className="flex flex-col gap-1.5">
          {OPTIONS.map((opt) => {
            const on = value?.decision === opt;
            return (
              <div key={opt}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={readOnly}
                  onClick={() => patch({ decision: opt })}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[var(--r-md)] border px-2.5 py-2 text-left text-[12.5px] disabled:cursor-default",
                    on
                      ? "border-[var(--primary)] bg-[var(--primary-tint)]"
                      : "border-[var(--border)] bg-[hsl(var(--card))] hover:bg-[var(--bg-subtle)]",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border-[1.5px]",
                      on ? "border-[var(--primary)]" : "border-[var(--border-strong)]",
                    )}
                  >
                    {on ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" /> : null}
                  </span>
                  {t(`tariff.decision.${opt}`)}
                </button>
                {on && opt === "not_applicable" ? (
                  <>
                    <Textarea
                      className="mt-1.5 min-h-[56px] text-[12.5px]"
                      placeholder={t("tariff.naPlaceholder")}
                      value={value?.note ?? ""}
                      disabled={readOnly}
                      onChange={(e) => patch({ note: e.target.value || null })}
                    />
                    {!value?.note?.trim() ? (
                      <div className="mt-1 text-[11px] text-[var(--warn-strong)]">{t("tariff.naRequired")}</div>
                    ) : null}
                  </>
                ) : null}
                {on && opt === "exempt" ? (
                  <div className="mt-1.5 flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--bg-muted)] px-2.5 py-2 text-[12px]">
                    <FileText className="h-[13px] w-[13px] text-[var(--text-subtle)]" />
                    <span className="flex-1 text-[var(--text-muted)]">{t("tariff.exemptDocHint")}</span>
                    {onGoToDocs ? (
                      <Button size="sm" variant="outline" onClick={onGoToDocs}>
                        {t("tariff.toDocs")} <ArrowRight />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {producers.length > 0 ? (
          <div className="grid grid-cols-[1fr_auto] items-end gap-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[11.5px] font-medium text-[var(--text-muted)]">
                {t("tariff.producer")}{" "}
                <span className="font-normal text-[var(--text-faint)]">{t("tariff.producerHint")}</span>
              </span>
              <select
                className="h-[34px] rounded-[var(--r-md)] border border-[var(--border)] bg-[hsl(var(--card))] px-2 text-[12.5px]"
                value={matchedProducer ?? OTHER}
                disabled={readOnly}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v !== OTHER) onManufacturerChange(v);
                  // «прочие»: keep a non-listed manufacturer, drop a listed one.
                  else if (matchedProducer) onManufacturerChange(null);
                }}
              >
                {producers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value={OTHER}>{t("tariff.otherProducers")}</option>
              </select>
            </label>
            <div className="pb-2 text-[12.5px]">
              →{" "}
              <span className="font-mono font-semibold tabular-nums">
                {preview ? formatPct(preview.rate_pct) : "—"}
              </span>
            </div>
          </div>
        ) : null}

        {variants.length > 0 ? (
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] font-medium text-[var(--text-muted)]">{t("tariff.variant")}</span>
            <select
              className="h-[34px] rounded-[var(--r-md)] border border-[var(--border)] bg-[hsl(var(--card))] px-2 text-[12.5px]"
              value={value?.variant ?? ""}
              disabled={readOnly}
              onChange={(e) => patch({ variant: e.target.value || null })}
            >
              <option value="">{t("tariff.variantPick")}</option>
              {variants.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {manualOpen ? (
          <label className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            {t("tariff.manualRate")}
            <Input
              className="h-7 w-24 font-mono tabular-nums"
              inputMode="decimal"
              placeholder="21.89"
              value={value?.rate_pct ?? ""}
              disabled={readOnly}
              onChange={(e) => patch({ rate_pct: cleanRate(e.target.value) })}
            />
            %
          </label>
        ) : null}

        <div className="flex items-center gap-3 text-[11.5px] text-[var(--text-faint)]">
          {!manualOpen && !readOnly ? (
            <span>
              {t("tariff.manualQ")}{" "}
              <button type="button" className="underline" onClick={() => setManualOpen(true)}>
                {t("tariff.manualOpen")}
              </button>
            </span>
          ) : null}
          {value && !readOnly ? (
            <button type="button" className="ml-auto underline" onClick={() => onChange(undefined)}>
              {t("tariff.resetDecision")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
});
