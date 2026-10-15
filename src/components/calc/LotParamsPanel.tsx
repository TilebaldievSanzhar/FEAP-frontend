import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RemedyDecisionCard } from "@/components/tariff/RemedyDecisionCard";
import { COST_KINDS, type CostKind, type CostLine } from "@/api/calc";
import { INCOTERMS, type Incoterms, type RemedyDecision } from "@/api/dt-types";
import type { TnvedCodeInfo } from "@/api/types";
import { COMMON_ORIGINS, FREIGHT_EXPECTED, countryName, originOptions } from "@/lib/tariff";
import { cn } from "@/lib/utils";
import { CALC_CURRENCIES, SELECT_CLS, cleanDecimal, type LotState } from "./lot";

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-[12px] font-medium text-[var(--text-muted)]">
        {label} {hint ? <span className="font-normal text-[var(--text-faint)]">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function CurrencySelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <select className={cn(SELECT_CLS, "font-mono", className)} value={value} onChange={(e) => onChange(e.target.value)}>
      {CALC_CURRENCIES.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  );
}

export function OriginSelect({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const others = useMemo(
    () => originOptions(i18n.language).filter((c) => !COMMON_ORIGINS.includes(c)),
    [i18n.language],
  );
  return (
    <select
      className={cn(SELECT_CLS, className)}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{t("calc.originAny")}</option>
      <optgroup label={t("calc.originCommon")}>
        {COMMON_ORIGINS.map((c) => (
          <option key={c} value={c}>
            {c} — {countryName(c, i18n.language)}
          </option>
        ))}
      </optgroup>
      <optgroup label={t("calc.originAll")}>
        {others.map((c) => (
          <option key={c} value={c}>
            {c} — {countryName(c, i18n.language)}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

interface Props {
  lot: LotState;
  onChange: (next: LotState) => void;
  origin: string | null;
  onOriginChange: (origin: string | null) => void;
  date: string;
  onDateChange: (date: string) => void;
  /** Lookup for (code, origin): remedies to decide and conditional VAT benefits. */
  info: TnvedCodeInfo;
  focusRemedy?: string | null;
  /** «Цена распознана с изображения — проверьте». */
  priceFromImage?: boolean;
}

/**
 * v3.1 §3 — lot parameters on the /calc result (and the passport). Every change
 * re-runs POST /calc; nothing is computed here.
 */
export function LotParamsPanel({
  lot,
  onChange,
  origin,
  onOriginChange,
  date,
  onDateChange,
  info,
  focusRemedy,
  priceFromImage,
}: Props) {
  const { t } = useTranslation();
  const set = <K extends keyof LotState>(key: K, value: LotState[K]) => onChange({ ...lot, [key]: value });
  const remedies = origin ? info.trade_remedies : [];
  const unitMode = lot.priceMode === "unit";
  const freightExpected = FREIGHT_EXPECTED.includes(lot.incoterms);

  function setDecision(measureNo: string, decision: RemedyDecision | undefined) {
    const next = { ...lot.remedyDecisions };
    if (decision) next[measureNo] = decision;
    else delete next[measureNo];
    set("remedyDecisions", next);
  }

  function setCost(idx: number, patch: Partial<CostLine>) {
    set("costs", lot.costs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))] shadow-[var(--shadow-xs)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] px-[22px] py-3.5">
        <span className="text-[14px] font-semibold">{t("calc.lotTitle")}</span>
        <span className="text-[11.5px] text-[var(--text-subtle)]">{t("calc.lotHint")}</span>
      </div>

      <div className="flex flex-col gap-4 px-[22px] py-4">
        {/* Price */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex self-start rounded-[var(--r-md)] bg-[var(--bg-muted)] p-[3px]" role="tablist">
            {(["lot", "unit"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={lot.priceMode === m}
                onClick={() => set("priceMode", m)}
                className={cn(
                  "rounded-[var(--r-sm)] px-3 py-1 text-[12px]",
                  lot.priceMode === m
                    ? "bg-[hsl(var(--card))] font-medium text-[var(--text)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--text-subtle)] hover:text-[var(--text)]",
                )}
              >
                {m === "lot" ? t("calc.priceModeLot") : t("calc.priceModeUnit")}
              </button>
            ))}
          </div>
          <div className={cn("grid grid-cols-1 gap-3", unitMode ? "sm:grid-cols-[1fr_1fr]" : "sm:grid-cols-[1.2fr_1fr]")}>
            {unitMode ? (
              <Field label={t("calc.unitPrice")} hint={priceFromImage ? t("calc.fromImage") : undefined}>
                <div className="grid grid-cols-[1fr_76px] gap-1.5">
                  <Input
                    className={cn("font-mono tabular-nums", priceFromImage && "border-[var(--info-border)] bg-[var(--info-tint)]")}
                    inputMode="decimal"
                    placeholder="38.50"
                    value={lot.unitPrice}
                    onChange={(e) => set("unitPrice", cleanDecimal(e.target.value))}
                  />
                  <CurrencySelect value={lot.currency} onChange={(v) => set("currency", v)} />
                </div>
              </Field>
            ) : (
              <Field label={t("calc.lotValue")} hint={t("calc.lotValueHint")}>
                <div className="grid grid-cols-[1fr_76px] gap-1.5">
                  <Input
                    className="font-mono tabular-nums"
                    inputMode="decimal"
                    placeholder="10000.00"
                    value={lot.price}
                    onChange={(e) => set("price", cleanDecimal(e.target.value))}
                  />
                  <CurrencySelect value={lot.currency} onChange={(v) => set("currency", v)} />
                </div>
              </Field>
            )}
            <Field label={t("calc.qty")} hint={unitMode ? undefined : t("calc.qtyHint")}>
              <div className="grid grid-cols-[1fr_76px] gap-1.5">
                <Input
                  className="font-mono tabular-nums"
                  inputMode="decimal"
                  placeholder="1000"
                  value={lot.qty}
                  onChange={(e) => set("qty", cleanDecimal(e.target.value))}
                />
                <Input
                  className="text-[12.5px]"
                  maxLength={20}
                  value={lot.qtyUnit}
                  onChange={(e) => set("qtyUnit", e.target.value)}
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Origin · Incoterms · date */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t("calc.origin")}>
            <OriginSelect value={origin} onChange={onOriginChange} />
          </Field>
          <Field label={t("calc.incoterms")}>
            <select
              className={cn(SELECT_CLS, "font-mono")}
              value={lot.incoterms}
              onChange={(e) => set("incoterms", e.target.value as Incoterms)}
            >
              {INCOTERMS.map((term) => (
                <option key={term}>{term}</option>
              ))}
            </select>
          </Field>
          <Field label={t("calc.onDateLabel")}>
            <Input type="date" className="font-mono" value={date} onChange={(e) => onDateChange(e.target.value)} />
          </Field>
        </div>
        <div className="-mt-2 text-[11.5px] text-[var(--text-subtle)]">
          {freightExpected ? t("calc.incotermsFreightOut") : t("calc.incotermsFreightIn")}
        </div>

        {freightExpected ? (
          <Field label={t("calc.freightToBorder")} hint={t("calc.inCurrency", { currency: lot.currency })}>
            <Input
              className="max-w-[240px] font-mono tabular-nums"
              inputMode="decimal"
              placeholder="0.00"
              value={lot.freightToBorder}
              onChange={(e) => set("freightToBorder", cleanDecimal(e.target.value))}
            />
          </Field>
        ) : null}

        <Field label={t("calc.manufacturer")} hint={t("calc.manufacturerHint")}>
          <Input
            value={lot.manufacturer}
            placeholder="Zhejiang Supor Co., Ltd."
            maxLength={300}
            onChange={(e) => set("manufacturer", e.target.value)}
          />
        </Field>

        {/* Trade remedies: the decision drives the duty */}
        {remedies.length ? (
          <div className="flex flex-col gap-2.5">
            <div className="eyebrow">{t("calc.remediesTitle")}</div>
            {remedies.map((m) => (
              <RemedyDecisionCard
                key={m.measure_no}
                measure={m}
                origin={origin}
                value={lot.remedyDecisions[m.measure_no]}
                manufacturer={lot.manufacturer}
                onChange={(d) => setDecision(m.measure_no, d)}
                onManufacturerChange={(v) => set("manufacturer", v ?? "")}
                focus={focusRemedy === m.measure_no && !lot.remedyDecisions[m.measure_no]}
              />
            ))}
          </div>
        ) : null}

        {info.vat_conditional.length ? (
          <Field label={t("items.vatBenefit")}>
            <select
              className={SELECT_CLS}
              value={lot.vatBenefit ?? ""}
              onChange={(e) => set("vatBenefit", e.target.value || null)}
            >
              <option value="">{t("items.vatGeneral", { rate: info.vat_rate ?? "12%" })}</option>
              {info.vat_conditional.map((o) => (
                <option key={o.source} value={o.source}>
                  {o.rate} · {o.note ?? o.condition.slice(0, 80)} · {o.legal_ref}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {/* Costs outside the customs value */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">
              {t("calc.costsTitle")} <span className="font-normal text-[var(--text-faint)]">{t("calc.costsHint")}</span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={lot.costs.length >= 20}
              onClick={() => set("costs", [...lot.costs, { kind: "logistics", amount: "", currency: "KGS" }])}
            >
              <Plus /> {t("calc.addCost")}
            </Button>
          </div>
          {lot.costs.map((c, idx) => (
            <div key={idx} className="grid grid-cols-[minmax(0,1fr)_120px_76px_32px] items-center gap-1.5">
              <select
                className={SELECT_CLS}
                value={c.kind}
                onChange={(e) => setCost(idx, { kind: e.target.value as CostKind })}
              >
                {COST_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`calc.costKind.${k}`)}
                  </option>
                ))}
              </select>
              <Input
                className="font-mono tabular-nums"
                inputMode="decimal"
                placeholder="0.00"
                value={c.amount}
                onChange={(e) => setCost(idx, { amount: cleanDecimal(e.target.value) })}
              />
              <CurrencySelect value={c.currency} onChange={(v) => setCost(idx, { currency: v })} />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-[var(--text-faint)] hover:text-[var(--danger)]"
                aria-label={t("calc.removeCost")}
                onClick={() => set("costs", lot.costs.filter((_, i) => i !== idx))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
