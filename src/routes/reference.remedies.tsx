import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ExternalLink, Info, Search, X } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHead } from "@/components/layout/PageHead";
import { StatusPill } from "@/components/dt/badges";
import { ProducerRates } from "@/components/tariff/RemedyBlock";
import { useRemedyKindLabel } from "@/components/tariff/useRemedyKindLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTradeRemedies } from "@/api/reference";
import { formatHsCode } from "@/api/dt-types";
import type { TradeRemedyRegistryItem } from "@/api/types";
import { parseApiError } from "@/lib/errors";
import { countryName, formatIsoDate, ratesForOrigin, remedyRateSummary } from "@/lib/tariff";
import { cn } from "@/lib/utils";

interface RemediesSearch {
  code?: string;
  origin?: string;
}

/** How many measure codes to list in a table row before «+N». */
const ROW_CODES = 3;

/**
 * v3 §6.1 — EAEU trade remedies registry (GET /reference/trade-remedies):
 * every applied or suspended measure, searchable by HS prefix and origin.
 */
function RemediesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [codeInput, setCodeInput] = useState(search.code ?? "");
  const [selected, setSelected] = useState<string | null>(null);

  // Full registry → country options; filtered list → table.
  const all = useTradeRemedies();
  const list = useTradeRemedies({ code: search.code, origin: search.origin });
  const measures = list.data ?? [];
  const current = measures.find((m) => m.measure_no === selected) ?? measures[0] ?? null;
  const countries = [...new Set((all.data ?? []).flatMap((m) => m.countries))].sort((a, b) =>
    countryName(a, i18n.language).localeCompare(countryName(b, i18n.language), i18n.language),
  );

  useEffect(() => setCodeInput(search.code ?? ""), [search.code]);

  function apply(next: RemediesSearch) {
    setSelected(null);
    void navigate({ to: "/reference/remedies", search: { ...search, ...next }, replace: true });
  }

  const codeValid = codeInput === "" || /^\d{2,10}$/.test(codeInput);
  const filtered = Boolean(search.code || search.origin);

  return (
    <AppShell crumbs={[t("shell.sectionRefs"), t("shell.navRemedies")]}>
      <PageHead
        eyebrow="/reference/remedies"
        title={t("remedies.title")}
        sub={list.data ? t("remedies.subCount", { n: measures.length }) : t("remedies.sub")}
        actions={
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (codeValid) apply({ code: codeInput || undefined });
            }}
          >
            <div className="relative w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-faint)]" />
              <Input
                className={cn("pl-8 font-mono", !codeValid && "border-[var(--danger)]")}
                inputMode="numeric"
                maxLength={10}
                placeholder={t("remedies.codePlaceholder")}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <select
              className="h-[34px] w-[180px] rounded-[var(--r-md)] border border-[var(--border)] bg-[hsl(var(--card))] px-2 text-[12.5px]"
              value={search.origin ?? ""}
              onChange={(e) => apply({ origin: e.target.value || undefined })}
            >
              <option value="">{t("remedies.allCountries")}</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c} — {countryName(c, i18n.language)}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" disabled={!codeValid}>
              {t("remedies.find")}
            </Button>
            {filtered ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCodeInput("");
                  apply({ code: undefined, origin: undefined });
                }}
              >
                <X /> {t("remedies.reset")}
              </Button>
            ) : null}
          </form>
        }
      />

      <div className="mb-4 flex items-center gap-2.5 rounded-[var(--r-md)] bg-[var(--bg-muted)] px-3.5 py-2.5 text-[12px] text-[var(--text-subtle)]">
        <Info className="h-[13px] w-[13px] shrink-0" />
        {t("remedies.banner")}
      </div>

      {list.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : list.isError ? (
        <div className="alert alert-warn">
          <div className="text-[12.5px]">{parseApiError(list.error).message}</div>
        </div>
      ) : measures.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))] p-6 text-[13px] text-[var(--text-muted)]">
          {search.code ? t("remedies.none", { code: formatHsCode(search.code) }) : t("remedies.noneAll")}
          {search.origin ? ` · ${countryName(search.origin, i18n.language)}` : ""}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="overflow-x-auto rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
            <RemediesTable
              measures={measures}
              origin={search.origin ?? null}
              selected={current?.measure_no ?? null}
              onSelect={setSelected}
            />
          </div>
          {current ? <RemedyCard measure={current} origin={search.origin ?? null} /> : null}
        </div>
      )}
    </AppShell>
  );
}

function RegistryStatus({ status }: { status: string }) {
  const { t } = useTranslation();
  return status === "applied" ? (
    <StatusPill kind="ok">{t("remedies.applied")}</StatusPill>
  ) : (
    <StatusPill kind="mute">{t(`remedies.status.${status}`, { defaultValue: status })}</StatusPill>
  );
}

function RemediesTable({
  measures,
  origin,
  selected,
  onSelect,
}: {
  measures: TradeRemedyRegistryItem[];
  origin: string | null;
  selected: string | null;
  onSelect: (no: string) => void;
}) {
  const { t } = useTranslation();
  const kindLabel = useRemedyKindLabel();
  return (
    <table className="w-full border-separate border-spacing-0 text-[12.5px]">
      <thead>
        <tr>
          {[
            { l: t("remedies.colMeasure"), c: "w-[80px]" },
            { l: t("remedies.colProduct"), c: "min-w-[220px]" },
            { l: t("remedies.colCountries"), c: "w-[130px]" },
            { l: t("remedies.colRate"), c: "w-[120px] text-right" },
            { l: t("remedies.colValidTo"), c: "w-[100px]" },
            { l: t("remedies.colStatus"), c: "w-[150px]" },
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
        {measures.map((m) => (
          <tr
            key={m.measure_no}
            onClick={() => onSelect(m.measure_no)}
            className={cn(
              "cursor-pointer align-top",
              m.status !== "applied" && "text-[var(--text-subtle)]",
              selected === m.measure_no ? "bg-[var(--primary-tint)]" : "hover:bg-[var(--bg-subtle)]",
            )}
          >
            <td className="border-b border-[var(--border)] px-3 py-2.5 font-mono font-semibold whitespace-nowrap">{m.measure_no}</td>
            <td className="border-b border-[var(--border)] px-3 py-2.5">
              <div>{m.title}</div>
              <div className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
                {kindLabel(m.kind)} ·{" "}
                <span className="font-mono">
                  {m.codes.slice(0, ROW_CODES).map(formatHsCode).join(", ")}
                  {m.codes.length > ROW_CODES ? ` +${m.codes.length - ROW_CODES}` : ""}
                </span>
              </div>
            </td>
            <td className="border-b border-[var(--border)] px-3 py-2.5">
              <div className="flex flex-wrap gap-1">
                {m.countries.map((c) => (
                  <span key={c} className="chip chip-outline h-[19px] font-mono text-[10.5px]">
                    {c}
                  </span>
                ))}
              </div>
            </td>
            <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
              {remedyRateSummary(m, origin)}
            </td>
            <td className="border-b border-[var(--border)] px-3 py-2.5 font-mono text-[11.5px] tabular-nums text-[var(--text-subtle)]">
              {formatIsoDate(m.valid_to) || "—"}
            </td>
            <td className="border-b border-[var(--border)] px-3 py-2.5">
              <RegistryStatus status={m.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RemedyCard({ measure: m, origin }: { measure: TradeRemedyRegistryItem; origin: string | null }) {
  const { t } = useTranslation();
  const kindLabel = useRemedyKindLabel();
  const rates = ratesForOrigin(m, origin);
  const legal = (m.legal_basis ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  return (
    <aside className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
      <div className="border-b border-[var(--border)] px-[18px] py-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[16px] font-semibold">{m.measure_no}</span>
          <RegistryStatus status={m.status} />
        </div>
        <div className="mt-1 text-[15px] font-medium">{m.title}</div>
        <div className="mt-0.5 text-[12px] text-[var(--text-subtle)]">
          {kindLabel(m.kind)}
          {m.valid_to ? ` · ${t("tariff.validTo", { date: formatIsoDate(m.valid_to) })}` : ""}
        </div>
      </div>
      <div className="flex flex-col gap-3.5 px-[18px] py-3.5">
        {m.product_description ? (
          <div className="text-[12.5px] leading-relaxed">{m.product_description}</div>
        ) : null}
        <div>
          <div className="eyebrow mb-1.5">{t("remedies.codes")}</div>
          <div className="flex flex-wrap gap-1">
            {m.codes.map((c) => (
              <span key={c} className="chip chip-outline h-[19px] font-mono text-[10.5px]">
                {formatHsCode(c)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-1.5">{t("remedies.rates")}</div>
          {rates.length ? (
            <div className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--border)]">
              <ProducerRates rates={rates} />
            </div>
          ) : (
            <div className="text-[12px] text-[var(--text-subtle)]">
              {m.needs_review ? t("remedies.ratesNeedReview") : "—"}
            </div>
          )}
        </div>
        {m.notes ? (
          <div className="flex gap-1.5 text-[11.5px] leading-snug text-[var(--text-muted)]">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-[var(--info)]" />
            {m.notes}
          </div>
        ) : null}
        {legal.length ? (
          <div className="border-t border-[var(--border)] pt-2.5 text-[11px] leading-relaxed text-[var(--text-subtle)]">
            {legal.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        ) : null}
        {m.source_url ? (
          <Button variant="outline" size="sm" className="self-start" asChild>
            <a href={m.source_url} target="_blank" rel="noreferrer noopener">
              <ExternalLink /> {t("remedies.eecCard")}
            </a>
          </Button>
        ) : null}
      </div>
    </aside>
  );
}

export const Route = createFileRoute("/reference/remedies")({
  validateSearch: (search: Record<string, unknown>): RemediesSearch => {
    const code = typeof search.code === "string" || typeof search.code === "number" ? String(search.code).replace(/\D/g, "") : "";
    const origin = typeof search.origin === "string" ? search.origin.toUpperCase() : undefined;
    return {
      code: code.length >= 2 && code.length <= 10 ? code : undefined,
      origin: origin && /^[A-Z]{2}$/.test(origin) ? origin : undefined,
    };
  },
  component: RemediesPage,
});
