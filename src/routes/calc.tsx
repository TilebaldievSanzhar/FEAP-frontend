import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FolderOpen,
  HelpCircle,
  Loader2,
  Lock,
  Package,
  RotateCcw,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHead } from "@/components/layout/PageHead";
import { CalcStepper } from "@/components/calc/CalcStepper";
import { CatalogEditor } from "@/components/catalog/CatalogEditor";
import { ClassificationChain } from "@/components/classify/ClassificationChain";
import { NeedsInputDialog } from "@/components/classify/NeedsInputDialog";
import { CountryChip } from "@/components/tariff/CountryChip";
import { HsChain } from "@/components/tariff/HsChain";
import { TariffSummary } from "@/components/tariff/TariffSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useClassify, useResume } from "@/api/classify";
import { useUpsertCatalogItem } from "@/api/dt";
import { activeAgreementFor, useTradeAgreements } from "@/api/reference";
import { normalizeOrigin, useCodeLookup } from "@/api/tnved";
import { ApiError } from "@/api/client";
import { formatHsCode } from "@/api/dt-types";
import type {
  ClassificationChainStep,
  ClassifyNeedsInput,
  ClassifyResponse,
  TnvedCodeInfo,
} from "@/api/types";
import { anonCalcsUsedToday, countAnonCalc, loadRecentCalcs, pushRecentCalc } from "@/lib/calc-storage";
import { getConfig } from "@/lib/config";
import { parseApiError } from "@/lib/errors";
import { COMMON_ORIGINS, EAEU_MEMBERS, countryName, formatIsoDate, originOptions, todayIso } from "@/lib/tariff";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

interface CalcSearch {
  code?: string;
  origin?: string;
  date?: string;
  value?: string;
  currency?: string;
  desc?: string;
}

const CURRENCIES = ["USD", "EUR", "CNY", "RUB", "KZT", "KGS", "TRY", "AED"];

/** Classification of the current session — shown on the result as «каскад · 0.94». */
let lastClassification: {
  code: string;
  confidence: number;
  chain: ClassificationChainStep[];
} | null = null;

function CalcPage() {
  const search = Route.useSearch();
  return search.code ? <CalcResult search={search as CalcSearch & { code: string }} /> : <CalcInput />;
}

// ── Steps 1–2: what is the product → code ───────────────────────────────────

function CalcInput() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const limit = getConfig().calcAnonDailyLimit;

  const [mode, setMode] = useState<"desc" | "code">("desc");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [origin, setOrigin] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState(todayIso());
  const [needsInput, setNeedsInput] = useState<ClassifyNeedsInput | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [used, setUsed] = useState(anonCalcsUsedToday);
  const [recent] = useState(loadRecentCalcs);

  const classify = useClassify();
  const resume = useResume(needsInput?.session_id ?? null);

  const anonymous = !token;
  const left = Math.max(0, limit - used);
  const blocked = anonymous && limit > 0 && left === 0;
  const busy = classify.isPending || resume.isPending;
  const step = busy || needsInput ? 2 : 1;
  const canSubmit =
    !busy && !blocked && (mode === "desc" ? description.trim().length >= 3 : /^\d{10}$/.test(code));

  function goToResult(finalCode: string) {
    if (anonymous && limit > 0) setUsed(countAnonCalc());
    void navigate({
      to: "/calc",
      search: {
        code: finalCode,
        origin: normalizeOrigin(origin) ?? undefined,
        date: date && date !== todayIso() ? date : undefined,
        value: value.trim() || undefined,
        currency: value.trim() ? currency : undefined,
        desc: description.trim() || undefined,
      },
    });
  }

  function handle(res: ClassifyResponse) {
    if (res.status === "completed") {
      const finalCode = res.result.final_code.replace(/\D/g, "");
      lastClassification = {
        code: finalCode,
        confidence: res.result.confidence,
        chain: res.result.classification_chain ?? [],
      };
      setNeedsInput(null);
      setDialogOpen(false);
      goToResult(finalCode);
    } else if (res.status === "needs_input") {
      setNeedsInput(res);
      setDialogOpen(true);
    } else {
      toast.error(res.error || t("errors.generic"));
    }
  }

  async function onSubmit() {
    if (!canSubmit) return;
    if (mode === "code") {
      lastClassification = null;
      goToResult(code);
      return;
    }
    try {
      setNeedsInput(null);
      handle(await classify.mutateAsync({ description: description.trim() }));
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message, {
        description: parsed.requestId ? `Request ID: ${parsed.requestId}` : undefined,
      });
    }
  }

  async function onAnswer(answers: Record<string, string>) {
    try {
      handle(await resume.mutateAsync(answers));
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  const otherOrigins = useMemo(
    () => originOptions(i18n.language).filter((c) => !COMMON_ORIGINS.includes(c)),
    [i18n.language],
  );

  return (
    <AppShell crumbs={[t("shell.sectionTools"), t("shell.navCalc")]}>
      <PageHead eyebrow={`/calc · ${t("calc.eyebrowMain")}`} title={t("calc.title")} sub={t("calc.sub")}>
        <CalcStepper step={step} />
      </PageHead>

      <div className="flex max-w-[760px] flex-col gap-4">
        <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))] shadow-[var(--shadow-xs)]">
          <form
            className="flex flex-col gap-[18px] p-[22px]"
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void onSubmit();
              }
            }}
          >
            <div className="inline-flex self-start rounded-[var(--r-md)] bg-[var(--bg-muted)] p-[3px]" role="tablist">
              {(["desc", "code"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-[var(--r-sm)] px-3.5 py-1.5 text-[12.5px]",
                    mode === m
                      ? "bg-[hsl(var(--card))] font-medium text-[var(--text)] shadow-[var(--shadow-sm)]"
                      : "text-[var(--text-subtle)] hover:text-[var(--text)]",
                  )}
                >
                  {m === "desc" ? t("calc.modeDesc") : t("calc.modeCode")}
                </button>
              ))}
            </div>

            {mode === "desc" ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text-muted)]">
                  {t("calc.whatLabel")}{" "}
                  <span className="font-normal text-[var(--text-faint)]">{t("calc.whatHint")}</span>
                </span>
                <Textarea
                  className="min-h-[96px] text-[14px]"
                  placeholder={t("calc.whatPlaceholder")}
                  value={description}
                  maxLength={2000}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-[var(--text-muted)]">{t("calc.codeLabel")}</span>
                  <Input
                    className="font-mono text-[14px] tracking-wide"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="7615101000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-[var(--text-muted)]">
                    {t("calc.descOptional")}{" "}
                    <span className="font-normal text-[var(--text-faint)]">{t("calc.descOptionalHint")}</span>
                  </span>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text-muted)]">{t("calc.origin")}</span>
                <select
                  className="h-[34px] rounded-[var(--r-md)] border border-[var(--border)] bg-[hsl(var(--card))] px-2 text-[13px]"
                  value={origin.toUpperCase()}
                  onChange={(e) => setOrigin(e.target.value)}
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
                    {otherOrigins.map((c) => (
                      <option key={c} value={c}>
                        {c} — {countryName(c, i18n.language)}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text-muted)]">
                  {t("calc.value")} <span className="font-normal text-[var(--text-faint)]">{t("calc.optional")}</span>
                </span>
                <div className="grid grid-cols-[1fr_76px] gap-1.5">
                  <Input
                    className="font-mono tabular-nums"
                    inputMode="decimal"
                    placeholder="10000.00"
                    value={value}
                    onChange={(e) => setValue(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""))}
                  />
                  <select
                    className="h-[34px] rounded-[var(--r-md)] border border-[var(--border)] bg-[hsl(var(--card))] px-1.5 font-mono text-[12.5px]"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text-muted)]">{t("calc.onDateLabel")}</span>
                <Input
                  type="date"
                  className="font-mono"
                  value={date}
                  onChange={(e) => setDate(e.target.value || todayIso())}
                />
              </label>
            </div>

            <div className="text-[12px] leading-normal text-[var(--text-subtle)]">{t("calc.originHint")}</div>

            <div className="flex items-center gap-3">
              <Button type="submit" size="lg" disabled={!canSubmit}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                {mode === "desc" ? t("calc.submitDesc") : t("calc.submitCode")}
                {!busy ? <ArrowRight /> : null}
              </Button>
              <span className="text-[12px] text-[var(--text-faint)]">
                <kbd className="rounded border border-[var(--border)] bg-[var(--bg-muted)] px-1 font-mono text-[10.5px]">
                  Ctrl
                </kbd>{" "}
                <kbd className="rounded border border-[var(--border)] bg-[var(--bg-muted)] px-1 font-mono text-[10.5px]">
                  ↵
                </kbd>
              </span>
            </div>
          </form>
        </section>

        {busy && !needsInput ? (
          <div className="flex items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--info-border)] bg-[var(--info-tint)] px-3.5 py-2.5 text-[12.5px] text-[var(--info)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("calc.classifying")}
          </div>
        ) : null}

        {needsInput ? (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--r-md)] border border-[var(--warn-border)] bg-[var(--warn-tint)] px-3.5 py-2.5 text-[12.5px]">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--warn-strong)]" />
            <span className="text-[var(--text-muted)]">
              {t("calc.needsInput", { n: needsInput.partial.questions.length || needsInput.partial.missing_parameters.length })}
              {needsInput.partial.partial_code ? (
                <>
                  {" "}
                  · {t("calc.partialCode")}{" "}
                  <span className="font-mono font-semibold text-[var(--text)]">{needsInput.partial.partial_code}</span>
                </>
              ) : null}
            </span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setDialogOpen(true)}>
              {t("calc.answer")}
            </Button>
          </div>
        ) : null}

        {anonymous && limit > 0 ? (
          <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--r-md)] border border-dashed border-[var(--border-strong)] px-3.5 py-2.5 text-[12.5px] text-[var(--text-muted)]">
            <Lock className="h-[13px] w-[13px] text-[var(--text-subtle)]" />
            {blocked ? (
              <span>{t("calc.anonExhausted", { limit })}</span>
            ) : (
              <span>
                {t("calc.anonLeftPrefix")}{" "}
                <span className="font-mono font-semibold tabular-nums text-[var(--text)]">
                  {t("calc.anonLeftCount", { left, limit })}
                </span>{" "}
                {t("calc.anonLeftSuffix")}
              </span>
            )}
            <Link
              to="/login"
              search={{ redirect: "/calc" }}
              className="ml-auto text-[var(--primary)] underline"
            >
              {t("auth.loginTitle")}
            </Link>
          </div>
        ) : null}

        {recent.length ? (
          <div>
            <div className="eyebrow mb-2">{t("calc.recent")}</div>
            <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
              {recent.map((r, i) => (
                <Link
                  key={`${r.code}-${r.origin}`}
                  to="/calc"
                  search={{ code: r.code, origin: r.origin ?? undefined, desc: r.description ?? undefined }}
                  className={cn(
                    "grid grid-cols-[130px_1fr_auto_auto] items-center gap-3.5 px-3.5 py-2.5 text-[var(--text)] no-underline hover:bg-[var(--bg-subtle)]",
                    i < recent.length - 1 && "border-b border-[var(--border)]",
                  )}
                >
                  <span className="font-mono text-[12.5px] font-medium">{formatHsCode(r.code)}</span>
                  <span className="truncate text-[12.5px] text-[var(--text-muted)]">{r.description ?? "—"}</span>
                  {r.origin ? <CountryChip code={r.origin} /> : <span />}
                  <span className="flex gap-1">
                    {r.flags.slice(0, 2).map((f) => (
                      <span key={f} className="chip chip-outline text-[10.5px]">
                        {f}
                      </span>
                    ))}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {needsInput ? (
        <NeedsInputDialog
          data={needsInput}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={onAnswer}
          submitting={resume.isPending}
        />
      ) : null}
    </AppShell>
  );
}

// ── Steps 3–4: rates & restrictions → next ──────────────────────────────────

function CalcResult({ search }: { search: CalcSearch & { code: string } }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const origin = normalizeOrigin(search.origin);
  const date = search.date ?? todayIso();
  const lookup = useCodeLookup(search.code, { origin, onDate: search.date ?? null });
  const agreements = useTradeAgreements();
  const upsert = useUpsertCatalogItem();
  const [copied, setCopied] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const info = lookup.data;
  const classified = lastClassification?.code === search.code ? lastClassification : null;
  const fta = activeAgreementFor(agreements.data, origin, date);
  const eaeuOrigin = Boolean(origin && EAEU_MEMBERS.includes(origin));

  useEffect(() => {
    if (!info) return;
    const flags = [
      ...info.trade_remedies.map((m) => m.measure_no),
      ...(info.vat_conditional.length ? [t("calc.flagVat")] : []),
      ...(fta ? [t("calc.flagFta")] : []),
    ];
    pushRecentCalc({ code: info.code, origin, description: search.desc ?? info.name, flags });
  }, [info, origin, search.desc, fta, t]);

  const currentHref = `/calc?${new URLSearchParams(
    Object.entries(search).filter(([, v]) => v != null) as [string, string][],
  ).toString()}`;

  function requireLogin(): boolean {
    if (token) return false;
    toast.info(t("calc.loginToContinue"));
    void navigate({ to: "/login", search: { redirect: currentHref } });
    return true;
  }

  function onCreateShipment() {
    if (requireLogin()) return;
    void navigate({
      to: "/declarations/new",
      search: {
        code: search.code,
        origin: origin ?? undefined,
        desc: search.desc ?? info?.name,
        value: search.value,
        currency: search.currency,
      },
    });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(search.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — nothing to do
    }
  }

  const notFound = lookup.error instanceof ApiError && lookup.error.status === 404;
  const valueLabel = search.value ? `${search.value} ${search.currency ?? ""}`.trim() : null;

  return (
    <AppShell crumbs={[t("shell.sectionTools"), t("shell.navCalc"), formatHsCode(search.code)]}>
      <PageHead
        eyebrow={`/calc?code=${search.code}${origin ? `&origin=${origin}` : ""}`}
        title={t("calc.title")}
        sub={search.desc ?? info?.name}
        actions={
          <Button variant="ghost" size="sm" onClick={() => void navigate({ to: "/calc" })}>
            <RotateCcw /> {t("calc.newCalc")}
          </Button>
        }
      >
        <CalcStepper step={3} />
      </PageHead>

      {lookup.isLoading ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[220px] w-full" />
        </div>
      ) : !info ? (
        <div className="alert alert-warn max-w-[760px]">
          <div className="flex-1 text-[12.5px]">
            {notFound ? t("calc.codeNotFound", { code: formatHsCode(search.code) }) : parseApiError(lookup.error).message}
          </div>
          <Button size="sm" variant="outline" onClick={() => void navigate({ to: "/calc" })}>
            {t("calc.newCalc")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0 rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))] shadow-[var(--shadow-xs)]">
            <div className="flex flex-wrap items-start gap-4 border-b border-[var(--border)] px-[22px] pb-4 pt-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-[28px] font-semibold tracking-tight">{info.code_formatted}</span>
                  <span className="text-[15px] text-[var(--text-muted)]">{info.name}</span>
                </div>
                <div className="mt-2.5">
                  {classified?.chain.length ? (
                    <ClassificationChain chain={classified.chain} className="text-[12px]" />
                  ) : (
                    <HsChain code={info.code} />
                  )}
                </div>
                {classified ? (
                  <div className="mt-2.5">
                    <span className="inline-flex h-[18px] items-center gap-1 rounded-full bg-[var(--primary-tint)] px-[7px] font-mono text-[10.5px] text-[var(--primary)]">
                      {t("calc.byCascade")} · {classified.confidence.toFixed(2)}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button variant="outline" size="sm" onClick={() => void copyCode()}>
                  {copied ? <Check /> : <Copy />} {copied ? t("actions.copied") : t("calc.copyCode")}
                </Button>
                <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-subtle)]">
                  {origin ? <CountryChip code={origin} /> : <span className="chip chip-outline">{t("calc.allCountries")}</span>}
                  {t("calc.asOf", { date: formatIsoDate(date) })}
                </span>
              </div>
            </div>
            <div className="px-[22px] pb-[18px] pt-1.5">
              <TariffSummary info={info} origin={origin} openFirstRemedy />
              {eaeuOrigin ? (
                <div className="mt-2.5 rounded-[var(--r-md)] border border-[var(--info-border)] bg-[var(--info-tint)] px-3.5 py-2.5 text-[12.5px] text-[var(--text-muted)]">
                  {t("calc.eaeuOrigin", { country: countryName(origin) })}
                </div>
              ) : null}
              {fta ? (
                <div className="mt-2.5 rounded-[var(--r-md)] border border-[var(--info-border)] bg-[var(--info-tint)] px-3.5 py-2.5 text-[12.5px]">
                  <span className="font-medium text-[var(--info)]">
                    {t("calc.ftaAvailable", { country: countryName(fta.country), date: formatIsoDate(fta.in_force_from) })}
                  </span>
                  <div className="mt-1 text-[12px] text-[var(--text-muted)]">
                    {t("calc.ftaHint")}
                    {fta.origin_proof ? ` · ${fta.origin_proof}` : ""}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <CalcNextSteps
            info={info}
            valueLabel={valueLabel}
            onCreateShipment={onCreateShipment}
            onSave={() => {
              if (!requireLogin()) setSaveOpen(true);
            }}
          />
        </div>
      )}

      {info ? (
        <CatalogEditor
          key={`${info.code}-${origin ?? ""}`}
          open={saveOpen}
          onOpenChange={setSaveOpen}
          item={null}
          initial={{
            description: search.desc ?? info.name,
            hs_code: info.code,
            attributes: origin ? { origin } : {},
          }}
          pending={upsert.isPending}
          onSubmit={async (payload) => {
            try {
              const saved = await upsert.mutateAsync(payload);
              setSaveOpen(false);
              toast.success(t("calc.saved"), {
                action: {
                  label: t("calc.openPassport"),
                  onClick: () => void navigate({ to: "/catalog/$sku", params: { sku: saved.sku } }),
                },
              });
            } catch (err) {
              toast.error(parseApiError(err).message);
            }
          }}
        />
      ) : null}
    </AppShell>
  );
}

function CalcNextSteps({
  info,
  valueLabel,
  onCreateShipment,
  onSave,
}: {
  info: TnvedCodeInfo;
  valueLabel: string | null;
  onCreateShipment: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const remedies = info.trade_remedies.map((m) => m.measure_no);
  return (
    <aside className="flex flex-col gap-3.5">
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
        <div className="border-b border-[var(--border)] px-4 py-3 text-[13px] font-semibold">{t("calc.amountsTitle")}</div>
        <div className="flex flex-col gap-2.5 px-4 py-3.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          <div>
            {valueLabel ? (
              <>
                {t("calc.amountsFor")}{" "}
                <span className="font-mono tabular-nums text-[var(--text)]">{valueLabel}</span>{" "}
                {t("calc.amountsDraft")}
              </>
            ) : (
              t("calc.amountsNoValue")
            )}
          </div>
          <div className="text-[11.5px] text-[var(--text-subtle)]">{t("calc.amountsRatesOnly")}</div>
        </div>
      </div>

      <div className="eyebrow mt-1">{t("calc.nextEyebrow")}</div>
      <Button size="lg" className="justify-center" onClick={onCreateShipment}>
        <FolderOpen /> {t("calc.createShipment")}
      </Button>
      <Button variant="outline" className="justify-center" onClick={onSave}>
        <Package /> {t("calc.saveToProducts")}
      </Button>
      <Button variant="ghost" className="justify-center text-[var(--text-faint)]" disabled>
        <Download /> {t("calc.pdfSoon")}
      </Button>

      {remedies.length ? (
        <div className="border-t border-[var(--border)] pt-2.5 text-[11.5px] leading-normal text-[var(--text-subtle)]">
          {t("calc.remedyNextHint", { measures: remedies.join(", ") })}
        </div>
      ) : null}
    </aside>
  );
}

export const Route = createFileRoute("/calc")({
  validateSearch: (search: Record<string, unknown>): CalcSearch => {
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : undefined);
    const code = str(search.code)?.replace(/\D/g, "");
    const date = str(search.date);
    return {
      code: code && code.length === 10 ? code : undefined,
      origin: str(search.origin)?.toUpperCase(),
      date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
      value: str(search.value),
      currency: str(search.currency)?.toUpperCase(),
      desc: str(search.desc),
    };
  },
  component: CalcPage,
});
