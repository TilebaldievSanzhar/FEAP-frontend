import { useTranslation } from "react-i18next";
import { Check, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Small grey suffix after the «ИИ-предложение» header, e.g. "fixer · F-04". */
  title?: string;
  /** true → «проверено пересборкой», false → warn chip, undefined → no chip. */
  verified?: boolean;
  verifiedNote?: string;
  why?: React.ReactNode;
  evidence?: string[];
  actions?: React.ReactNode;
  muted?: boolean;
  children: React.ReactNode;
}

/**
 * §11.2 of the DT spec — the single recognizable pattern for every
 * LLM suggestion (fixer, графа 31, advisor). AI content is visually
 * separated from computed data; applying is always an explicit action.
 */
export function AICard({ title, verified, verifiedNote, why, evidence, actions, muted, children }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--r-lg)] border border-[var(--primary-tint-strong)] bg-[var(--primary-tint)]/40",
        muted && "opacity-75",
      )}
    >
      <div className="flex items-center gap-2 border-b border-[var(--primary-tint-strong)] px-3.5 py-2">
        <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]">
          {t("dt.aiSuggestion")}
        </span>
        {title ? <span className="text-[12px] text-[var(--text-subtle)]">· {title}</span> : null}
        <div className="flex-1" />
        {verified === true ? (
          <span className="inline-flex h-[20px] items-center gap-1 rounded-[var(--r-sm)] border border-[var(--success-border)] bg-[var(--success-tint)] px-1.5 text-[10.5px] text-[var(--success)]">
            <Check className="h-2.5 w-2.5" /> {t("dt.verifiedByRebuild")}
          </span>
        ) : null}
        {verified === false ? (
          <span className="inline-flex h-[20px] items-center gap-1 rounded-[var(--r-sm)] border border-[var(--warn-border)] bg-[var(--warn-tint)] px-1.5 text-[10.5px] text-[var(--warn-strong)]">
            <TriangleAlert className="h-2.5 w-2.5" /> {verifiedNote || t("dt.notVerified")}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        <div className="text-[13px] leading-relaxed text-[var(--text)]">{children}</div>
        {why ? (
          <div className="text-[12px] text-[var(--text-muted)]">
            <span className="font-semibold">{t("dt.why")}:</span> {why}
          </div>
        ) : null}
        {evidence && evidence.length > 0 ? (
          <details>
            <summary className="cursor-pointer text-[11.5px] text-[var(--text-subtle)]">
              {t("dt.evidence")} · {evidence.length}
            </summary>
            <ul className="mt-1.5 list-disc pl-4 text-[11.5px] leading-relaxed text-[var(--text-subtle)]">
              {evidence.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {actions ? <div className="mt-0.5 flex gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
