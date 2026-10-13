import { useTranslation } from "react-i18next";
import { Check, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GBadge } from "@/components/dt/badges";
import { INCOTERMS, type Incoterms, type PartyIn, type ShipmentIn } from "@/api/dt-types";
import { emptyParty } from "@/api/dt-types";
import { cn } from "@/lib/utils";

/** Incoterms whose базис requires freight-to-border (mirror of backend FREIGHT_EXPECTED). */
const FREIGHT_EXPECTED = new Set<Incoterms>(["EXW", "FCA", "FAS", "FOB"]);

const INN_KG_RE = /^\d{14}$/;

interface Props {
  value: ShipmentIn;
  onChange: (next: ShipmentIn) => void;
  onSave: () => void;
  onDiscard?: () => void;
  saving: boolean;
  dirty: boolean;
  canWrite: boolean;
  createMode?: boolean;
}

function Field({
  label,
  g,
  hint,
  children,
  className,
}: {
  label: string;
  g?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-[12px] font-medium text-[var(--text-muted)]">
        <span>
          {label} {g ? <GBadge g={g} /> : null}
        </span>
        {hint ? <span className="font-normal text-[var(--text-subtle)]">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[var(--r-md)] border px-3 py-1.5 text-[12px] disabled:opacity-50",
            o.value === value
              ? "border-[var(--primary)] bg-[var(--primary-tint)] text-[var(--primary)]"
              : "border-[var(--border-strong)] bg-[hsl(var(--card))] text-[var(--text-muted)] hover:border-[var(--text-faint)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PartyCard({
  title,
  g,
  party,
  onChange,
  disabled,
  innCheck,
}: {
  title: string;
  g: string;
  party: PartyIn;
  onChange: (p: PartyIn) => void;
  disabled?: boolean;
  innCheck?: boolean;
}) {
  const { t } = useTranslation();
  const innWarn = Boolean(innCheck && party.inn && !INN_KG_RE.test(party.inn));
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3.5 py-2.5">
        <span className="text-[12.5px] font-semibold">{title}</span>
        <GBadge g={g} />
      </div>
      <div className="grid gap-3 p-3.5">
        <Field label={t("ws.partyName")}>
          <Input
            value={party.name}
            disabled={disabled}
            onChange={(e) => onChange({ ...party, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("ws.partyCountry")}>
            <Input
              className="font-mono uppercase"
              maxLength={2}
              placeholder="CN"
              value={party.country ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...party, country: e.target.value.toUpperCase() || null })
              }
            />
          </Field>
          <Field label={t("ws.partyInn")}>
            <Input
              className={cn("font-mono", innWarn && "border-[var(--warn-border)]")}
              value={party.inn ?? ""}
              disabled={disabled}
              onChange={(e) => onChange({ ...party, inn: e.target.value || null })}
            />
            {innWarn ? (
              <div className="flex items-center gap-1 text-[10.5px] text-[var(--warn-strong)]">
                <TriangleAlert className="h-2.5 w-2.5" /> {t("ws.innWarn")}
              </div>
            ) : null}
          </Field>
        </div>
        <Field label={t("ws.partyAddress")}>
          <Input
            value={party.address ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ ...party, address: e.target.value || null })}
          />
        </Field>
      </div>
    </div>
  );
}

export function ShipmentFormTab({
  value,
  onChange,
  onSave,
  onDiscard,
  saving,
  dirty,
  canWrite,
  createMode,
}: Props) {
  const { t } = useTranslation();
  const ro = !canWrite;
  const declarantSynced = value.declarant == null;
  const freightWarn =
    FREIGHT_EXPECTED.has(value.incoterms) &&
    (!value.freight_to_border || Number(value.freight_to_border) === 0);

  const set = <K extends keyof ShipmentIn>(key: K, v: ShipmentIn[K]) =>
    onChange({ ...value, [key]: v });

  const moneyInput = (key: "freight_to_border" | "freight_beyond_border" | "insurance" | "other_charges") => (
    <Input
      className={cn(
        "font-mono tabular-nums",
        key === "freight_to_border" && freightWarn && "border-[var(--warn-border)]",
      )}
      placeholder="0.00"
      inputMode="decimal"
      value={value[key] === "0" ? "" : value[key]}
      disabled={ro}
      onChange={(e) => set(key, e.target.value.replace(",", ".") || "0")}
    />
  );

  return (
    <div className="flex max-w-[900px] flex-col gap-5">
      {/* Стороны */}
      <section>
        <div className="eyebrow mb-2.5">{t("ws.secParties")}</div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <PartyCard
            title={t("ws.seller")}
            g="2"
            party={value.seller}
            disabled={ro}
            onChange={(p) => set("seller", p)}
          />
          <PartyCard
            title={t("ws.buyer")}
            g="8/9"
            party={value.buyer}
            disabled={ro}
            onChange={(p) => set("buyer", p)}
            innCheck
          />
        </div>
        <div className="mt-2.5 flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[hsl(var(--card))] px-3.5 py-2.5">
          <span className="text-[12.5px] font-medium">
            {t("ws.declarant")} <GBadge g="14" />
          </span>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12.5px] text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={declarantSynced}
              disabled={ro}
              onChange={(e) => set("declarant", e.target.checked ? null : emptyParty())}
            />
            {t("ws.declarantSameAsBuyer")}
          </label>
        </div>
        {!declarantSynced && value.declarant ? (
          <div className="mt-2.5">
            <PartyCard
              title={t("ws.declarant")}
              g="14"
              party={value.declarant}
              disabled={ro}
              onChange={(p) => set("declarant", p)}
            />
          </div>
        ) : null}
      </section>

      {/* Сделка */}
      <section>
        <div className="eyebrow mb-2.5">{t("ws.secDeal")}</div>
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))] p-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("ws.procedure")} g="1">
              <div className="inline-flex h-9 items-center rounded-[var(--r-md)] bg-[var(--bg-muted)] px-2.5 font-mono text-[12px] text-[var(--text-muted)]">
                {t("ws.procedureIm40")}
              </div>
            </Field>
            <Field label={t("ws.tradingCountry")} g="11">
              <Input
                className="font-mono uppercase"
                maxLength={2}
                placeholder="CN"
                value={value.trading_country ?? ""}
                disabled={ro}
                onChange={(e) => set("trading_country", e.target.value.toUpperCase() || null)}
              />
            </Field>
            <Field label={t("ws.dispatchCountry")} g="15">
              <Input
                className="font-mono uppercase"
                maxLength={2}
                placeholder="CN"
                value={value.dispatch_country ?? ""}
                disabled={ro}
                onChange={(e) => set("dispatch_country", e.target.value.toUpperCase() || null)}
              />
            </Field>
            <Field label={t("ws.destinationCountry")} g="17">
              <Input
                className="font-mono uppercase"
                maxLength={2}
                value={value.destination_country}
                disabled={ro}
                onChange={(e) => set("destination_country", e.target.value.toUpperCase())}
              />
            </Field>
            <Field label={t("ws.incoterms")} g="20">
              <div className="grid grid-cols-[92px_1fr] gap-1.5">
                <select
                  className="h-9 rounded-[var(--r-md)] border border-[var(--border)] bg-card px-2 font-mono text-[13px] outline-none focus:border-[var(--primary)]"
                  value={value.incoterms}
                  disabled={ro}
                  onChange={(e) => set("incoterms", e.target.value as Incoterms)}
                >
                  {INCOTERMS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder={t("ws.incotermsPlace")}
                  value={value.incoterms_place ?? ""}
                  disabled={ro}
                  onChange={(e) => set("incoterms_place", e.target.value || null)}
                />
              </div>
            </Field>
            <Field label={t("ws.dealNature")} g="24" hint={t("ws.classifierHint")}>
              <Input
                className="font-mono"
                maxLength={3}
                placeholder="010"
                value={value.deal_nature ?? ""}
                disabled={ro}
                onChange={(e) => set("deal_nature", e.target.value || null)}
              />
            </Field>
            <Field label={t("ws.currency")} g="22">
              <Input
                className="font-mono uppercase"
                maxLength={3}
                value={value.contract_currency}
                disabled={ro}
                onChange={(e) => set("contract_currency", e.target.value.toUpperCase())}
              />
            </Field>
            <Field label={t("ws.rateDate")} g="23" hint={t("ws.rateDateHint")}>
              <Input
                type="date"
                className="font-mono"
                value={value.rate_date ?? ""}
                disabled={ro}
                onChange={(e) => set("rate_date", e.target.value || null)}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Доначисления */}
      <section>
        <div className="eyebrow mb-2.5">{t("ws.secAdditions")}</div>
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))] p-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("ws.freightToBorder")}>
              {moneyInput("freight_to_border")}
              {freightWarn ? (
                <div className="flex items-center gap-1 text-[10.5px] text-[var(--warn-strong)]">
                  <TriangleAlert className="h-2.5 w-2.5" />
                  {t("ws.freightWarn", { incoterms: value.incoterms })}
                </div>
              ) : null}
            </Field>
            <Field label={t("ws.freightBeyond")} hint={t("ws.deduction")}>
              {moneyInput("freight_beyond_border")}
            </Field>
            <Field label={t("ws.insurance")}>{moneyInput("insurance")}</Field>
            <Field label={t("ws.otherCharges")}>{moneyInput("other_charges")}</Field>
            <Field label={t("ws.allocationMethod")} className="sm:col-span-2">
              <ToggleGroup
                disabled={ro}
                options={[
                  { value: "gross_weight", label: t("ws.allocGross") },
                  { value: "value", label: t("ws.allocValue") },
                ]}
                value={value.allocation_method}
                onChange={(v) => set("allocation_method", v)}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Транспорт */}
      <section>
        <div className="eyebrow mb-2.5">{t("ws.secTransport")}</div>
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))] p-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("ws.transportType")} g="25" hint={t("ws.classifierHint")}>
              <Input
                className="font-mono"
                placeholder="30"
                value={value.transport_at_border_type ?? ""}
                disabled={ro}
                onChange={(e) => set("transport_at_border_type", e.target.value || null)}
              />
            </Field>
            <Field label={t("ws.transportIds")} g="18/21">
              <Input
                className="font-mono"
                value={value.transport_ids ?? ""}
                disabled={ro}
                onChange={(e) => set("transport_ids", e.target.value || null)}
              />
            </Field>
            <Field label={t("ws.container")} g="19">
              <ToggleGroup
                disabled={ro}
                options={[
                  { value: "none", label: "—" },
                  { value: "no", label: t("common.no") },
                  { value: "yes", label: t("common.yes") },
                ]}
                value={value.container == null ? "none" : value.container ? "yes" : "no"}
                onChange={(v) => set("container", v === "none" ? null : v === "yes")}
              />
            </Field>
            <Field label={t("ws.placesTotal")} g="6" hint={t("ws.placesHint")}>
              <Input
                className="font-mono tabular-nums"
                inputMode="numeric"
                value={value.places_total ?? ""}
                disabled={ro}
                onChange={(e) =>
                  set("places_total", e.target.value ? Number(e.target.value) : null)
                }
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Save bar */}
      <div className="flex items-center gap-3 border-t border-[var(--border)] py-3">
        <span className="text-[12px] text-[var(--text-subtle)]">
          {createMode ? t("ws.createHint") : t("ws.saveHint")}
        </span>
        <div className="flex-1" />
        {onDiscard ? (
          <Button variant="ghost" disabled={!dirty || saving} onClick={onDiscard}>
            {t("ws.discard")}
          </Button>
        ) : null}
        <Button disabled={(!dirty && !createMode) || saving || ro} onClick={onSave}>
          <Check /> {createMode ? t("ws.create") : t("ws.save")}
        </Button>
      </div>
    </div>
  );
}
