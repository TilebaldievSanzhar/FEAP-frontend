import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Download,
  Info,
  RefreshCw,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassificationChain } from "./ClassificationChain";
import { StatusChip } from "@/components/shared/StatusChip";
import { Confidence } from "@/components/shared/Confidence";
import type { ClassificationResult } from "@/api/types";
import { formatRate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  result: ClassificationResult;
  onReclassify?: () => void;
}

export function ClassificationResultCard({ result, onReclassify }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(true);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(result.final_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  const confidenceLabel =
    result.confidence >= 0.85
      ? t("result.confHigh")
      : result.confidence >= 0.6
        ? t("result.confMid")
        : t("result.confLow");

  return (
    <>
      <header className="mb-7 flex items-start gap-3">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <StatusChip status="completed" />
            <span className="chip chip-outline font-mono">session_01HK3Z…</span>
            <span className="chip chip-outline">
              <Clock className="h-2.5 w-2.5" />
              4.2 с
            </span>
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight">{result.code_description}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            {t("result.metaLine")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyCode}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("actions.copied") : t("actions.copy")}
          </Button>
          {onReclassify ? (
            <Button type="button" variant="outline" size="sm" onClick={onReclassify}>
              <RefreshCw className="h-4 w-4" />
              {t("actions.reclassify")}
            </Button>
          ) : null}
          <Button type="button" size="sm">
            <Download className="h-4 w-4" />
            {t("actions.export")}
          </Button>
        </div>
      </header>

      {/* Hero card */}
      <section className="mb-6 rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
        <div className="grid grid-cols-[auto_1px_1fr_auto] items-center gap-7 px-6 py-5">
          <div>
            <div className="kicker mb-1">{t("result.codeLabel")}</div>
            <div className="font-mono text-[28px] font-semibold tracking-tight text-[var(--primary)]">
              {result.code_formatted}
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--text-subtle)]">EAEU · 10-знач.</div>
          </div>
          <div className="h-12 w-px self-stretch bg-[var(--border)]" />
          <div>
            <div className="kicker mb-1">{t("result.nameLabel")}</div>
            <div className="mb-1.5 text-[15px] font-medium">{result.code_description}</div>
            <div className="flex flex-wrap items-center gap-2">
              {(result.opi_applied ?? []).map((opi) => (
                <span key={opi} className="chip chip-info">
                  <Cpu className="h-2.5 w-2.5" />
                  {t("result.opi")} {opi}
                </span>
              ))}
              <Link
                to="/tnved/$code"
                params={{ code: result.final_code }}
                className="chip chip-outline no-underline"
              >
                {t("actions.openInTree")}
              </Link>
            </div>
          </div>
          <div className="flex w-40 flex-col gap-1">
            <div className="kicker">{t("result.confidence")}</div>
            <Confidence value={result.confidence ?? 0} />
            <div className="text-[11.5px] text-[var(--text-subtle)]">{confidenceLabel}</div>
          </div>
        </div>
      </section>

      {/* Chain */}
      <section className="mb-6 rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
          <h3 className="text-sm font-semibold">{t("result.chain")}</h3>
          <span className="text-[12px] text-[var(--text-subtle)]">
            {result.classification_chain.length} {t("result.steps")}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setReasoningOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-[var(--r-sm)] px-2 py-1 text-[12px] hover:bg-[var(--bg-muted)]"
          >
            {reasoningOpen ? t("result.hideReasoning") : t("result.showReasoning")}
            <ChevronDown className={cn("h-3.5 w-3.5 transition", !reasoningOpen && "-rotate-90")} />
          </button>
        </div>
        <div className="px-6 py-5">
          <ClassificationChain chain={result.classification_chain} />
          {reasoningOpen && result.classification_chain.some((s) => s.reasoning) ? (
            <>
              <div className="my-4 h-px bg-[var(--border)]" />
              <div className="flex flex-col gap-2.5">
                {result.classification_chain
                  .filter((s) => s.reasoning)
                  .map((s, i) => (
                    <div key={`${s.code}-${i}`} className="flex items-start gap-3 text-[12.5px]">
                      <span className="chip chip-primary min-w-[140px] justify-center">
                        {s.level}: {s.code}
                      </span>
                      <span className="leading-relaxed text-[var(--text-muted)]">
                        {s.reasoning}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* Rates + NTM */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card px-6 py-5 shadow-[var(--shadow-xs)]">
          <div className="kicker mb-2.5">{t("result.duty")}</div>
          <div className="text-[32px] font-semibold tracking-tight">
            {formatRate(result.duty_rate)}
          </div>
          <div className="mt-1 text-[12px] text-[var(--text-subtle)]">
            {t("result.dutyHint")}
          </div>
          <div className="my-3 h-px bg-[var(--border)]" />
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-subtle)]">
            <Info className="h-3 w-3" />
            {t("result.dutyNote")}
          </div>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card px-6 py-5 shadow-[var(--shadow-xs)]">
          <div className="kicker mb-2.5">{t("result.vatExciseTitle")}</div>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-[22px] font-semibold">{formatRate(result.vat_rate)}</div>
              <div className="text-[11px] text-[var(--text-subtle)]">{t("result.vat")}</div>
            </div>
            <div>
              <div
                className={cn(
                  "text-[22px] font-semibold",
                  !result.excise_rate && "text-[var(--text-muted)]",
                )}
              >
                {result.excise_rate ? formatRate(result.excise_rate) : "—"}
              </div>
              <div className="text-[11px] text-[var(--text-subtle)]">{t("result.excise")}</div>
            </div>
          </div>
          <div className="my-3 h-px bg-[var(--border)]" />
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-subtle)]">
            <Check className="h-3 w-3" />
            {t("result.notExcisable")}
          </div>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
            <Shield className="h-3.5 w-3.5 text-[var(--info)]" />
            <h3 className="text-sm font-semibold">{t("result.ntmTitle")}</h3>
            <span className="chip chip-info">3 {t("result.applicable")}</span>
            <div className="flex-1" />
            <Button type="button" variant="ghost" size="sm">
              {t("actions.open")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex flex-col gap-2 px-4 py-3 text-[12.5px]">
            {[
              { t: "Сертификат соответствия ТР ТС 004/2011", s: "success" },
              { t: "Сертификат ТР ТС 020/2011 (ЭМС)", s: "success" },
              { t: "Декларация соответствия СЭЗ", s: "warn" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={cn(
                    "dot",
                    m.s === "success" ? "dot-success" : m.s === "warn" ? "dot-warn" : "dot-neutral",
                  )}
                />
                <span className="flex-1">{m.t}</span>
                <ChevronRight className="h-3 w-3 text-[var(--text-faint)]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk flags */}
      {result.risk_flags?.length || result.requires_human_review ? (
        <div className="alert alert-info">
          <Info className="alert-ico h-4 w-4" />
          <div className="flex-1 text-[12.5px] leading-snug">
            <div className="mb-0.5 text-[13px] font-semibold">{t("result.requiresReview")}</div>
            {result.risk_flags?.length
              ? result.risk_flags.join(" ")
              : t("result.requiresReviewHint")}
          </div>
          <Button type="button" variant="outline" size="sm">
            {t("result.sendForReview")}
          </Button>
        </div>
      ) : null}
    </>
  );
}
