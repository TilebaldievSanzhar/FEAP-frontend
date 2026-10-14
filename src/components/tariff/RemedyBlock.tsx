import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, ExternalLink, Info, ShieldAlert } from "lucide-react";

import { CountryChip } from "@/components/tariff/CountryChip";
import { useRemedyKindLabel } from "@/components/tariff/useRemedyKindLabel";
import type { TradeRemedy, TradeRemedyRate } from "@/api/types";
import {
  countryName,
  formatIsoDate,
  formatPct,
  ratesForOrigin,
  remedyRateSummary,
} from "@/lib/tariff";
import { cn } from "@/lib/utils";

interface Props {
  measure: TradeRemedy;
  /** Origin given → single-country line; otherwise all countries as chips. */
  origin?: string | null;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

/**
 * §3.2 — trade remedy block. Always «может применяться»: the code matched, but
 * whether the product falls under the measure is the declarant's call.
 */
export function RemedyBlock({ measure: m, origin, defaultOpen, children }: Props) {
  const { t, i18n } = useTranslation();
  const kindLabel = useRemedyKindLabel();
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const rates = ratesForOrigin(m, origin);
  const showTable = rates.length > 1 || rates.some((r) => r.producers.length > 0 || r.variant);
  const legal = (m.legal_basis ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--warn-border)] bg-[var(--warn-tint)]">
      <div className="grid grid-cols-[18px_1fr_auto] items-start gap-2.5 px-3.5 py-3">
        <ShieldAlert className="mt-px h-[15px] w-[15px] text-[var(--warn-strong)]" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-[var(--text)]">{kindLabel(m.kind)}</span>
            <span className="inline-flex h-5 items-center gap-1.5 rounded-full bg-[hsl(var(--card))] px-2 font-mono text-[10.5px] font-medium text-[var(--warn-strong)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]" />
              {t("tariff.mayApply")}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--text-muted)]">
            <span className="font-mono font-semibold text-[var(--text)]">{m.measure_no}</span>
            <span>«{m.title}»</span>
            {origin ? (
              <span>· {countryName(origin, i18n.language)}</span>
            ) : (
              m.countries.map((c) => <CountryChip key={c} code={c} />)
            )}
            {m.valid_to ? (
              <span>· {t("tariff.validTo", { date: formatIsoDate(m.valid_to) })}</span>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[20px] font-semibold leading-none tabular-nums text-[var(--warn-strong)]">
            {remedyRateSummary(m, origin)}
          </div>
          <div className="mt-[3px] text-[10.5px] text-[var(--text-subtle)]">{t("tariff.ofCustomsValue")}</div>
        </div>
      </div>

      {m.notes ? (
        <div className="mx-3.5 mb-2.5 ml-[42px] flex gap-1.5 text-[11.5px] leading-snug text-[var(--text-muted)]">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-[var(--info)]" />
          {m.notes}
        </div>
      ) : null}

      {children}

      <div className="border-t border-[var(--warn-border)] bg-[hsl(var(--card))] py-2 pl-[42px] pr-3.5">
        <div className="flex items-center gap-3.5 text-[12px]">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-expanded={open}
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {t("tariff.measureDescription")}
          </button>
          {m.source_url ? (
            <a
              href={m.source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[var(--primary)] no-underline hover:underline"
            >
              {t("tariff.eecSource")} <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        {open ? (
          <div className="mt-2 flex flex-col gap-2.5">
            {m.product_description ? (
              <div className="max-w-[640px] text-[12.5px] leading-relaxed text-[var(--text)]">
                {m.product_description}
              </div>
            ) : null}
            {showTable ? (
              <div className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--border)]">
                <ProducerRates rates={rates} />
              </div>
            ) : null}
            {legal.length ? (
              <div className="text-[11px] leading-relaxed text-[var(--text-subtle)]">
                {legal.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Producer / variant → rate. Empty producers = «прочие производители». */
export function ProducerRates({ rates }: { rates: TradeRemedyRate[] }) {
  const { t } = useTranslation();
  const hasVariants = rates.some((r) => r.variant);
  const rows = rates
    .slice()
    .sort((a, b) => (a.country ?? "").localeCompare(b.country ?? ""))
    .flatMap((r) =>
      r.producers.length
        ? r.producers.map((p) => ({ producer: p as string | null, r }))
        : [{ producer: null, r }],
    );
  return (
    <table className="w-full border-separate border-spacing-0 bg-[hsl(var(--card))] text-[12px]">
      <thead>
        <tr>
          {[
            { l: t("tariff.colProducer"), c: "" },
            ...(hasVariants ? [{ l: t("tariff.colVariant"), c: "" }] : []),
            { l: t("tariff.colCountry"), c: "w-[80px]" },
            { l: t("tariff.colRate"), c: "w-[90px] text-right" },
          ].map((h, i) => (
            <th
              key={i}
              className={cn(
                "border-b border-[var(--border)] bg-[var(--bg-muted)] px-3 py-1.5 text-left text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-subtle)]",
                h.c,
              )}
            >
              {h.l}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ producer, r }, i) => (
          <tr key={i}>
            <td
              className={cn(
                "border-b border-[var(--border)] px-3 py-1.5",
                producer ? "text-[var(--text)]" : "italic text-[var(--text-subtle)]",
              )}
            >
              {producer ?? t("tariff.otherProducers")}
            </td>
            {hasVariants ? (
              <td className="border-b border-[var(--border)] px-3 py-1.5 text-[var(--text-muted)]">
                {r.variant ?? "—"}
              </td>
            ) : null}
            <td className="border-b border-[var(--border)] px-3 py-1.5 font-mono text-[11.5px]">
              {r.country ?? "—"}
            </td>
            <td className="border-b border-[var(--border)] px-3 py-1.5 text-right font-mono font-semibold tabular-nums">
              {formatPct(r.rate_pct)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
