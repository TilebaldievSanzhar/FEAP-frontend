import { useTranslation } from "react-i18next";
import { Check, Info, Loader2, TriangleAlert } from "lucide-react";
import type { OcrJob, OcrStatus } from "@/api/types";
import { cn } from "@/lib/utils";

const ORDER: OcrStatus[] = ["pending", "extracting", "structuring", "completed"];

const TITLE_KEY: Record<number, string> = {
  0: "document.stage1Title",
  1: "document.stage2Title",
  2: "document.stage3Title",
  3: "document.stage4Title",
};

interface Props {
  job: OcrJob;
}

export function OcrProgressPanel({ job }: Props) {
  const { t } = useTranslation();
  const stageKey = (job.progress?.stage as OcrStatus) ?? job.status;
  const currentIdx = Math.max(0, ORDER.indexOf(stageKey));
  const total = job.progress?.stage_count ?? ORDER.length;
  const index = job.progress?.stage_index ?? currentIdx + 1;
  const pct = Math.min(100, Math.round((index / total) * 100));

  const failed = job.status === "failed" || job.status === "cancelled";
  const completed = job.status === "completed";
  const liveMessage = failed
    ? (job.error ?? t("document.ocrFailed"))
    : (job.progress?.message ?? t(`document.stage.${stageKey}`));

  return (
    <div
      className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-xs)]"
      role="status"
      aria-live="polite"
      aria-busy={!failed && !completed}
    >
      <div className="mb-3.5 flex items-baseline gap-3">
        <div className="flex-1">
          <div className="kicker">{t("document.stageStep", { cur: index, total })}</div>
          <div className="mt-0.5 text-[17px] font-semibold tracking-tight">
            {t(TITLE_KEY[currentIdx] ?? "document.stage1Title")}
          </div>
          <div className="text-[12.5px] text-[var(--text-subtle)]">{liveMessage}</div>
        </div>
        <div className="flex flex-col items-end">
          <div className="font-mono text-[22px] font-semibold tabular-nums">{pct}%</div>
          {!failed && !completed ? (
            <div className="text-[11.5px] text-[var(--text-subtle)]">
              {t("document.ocrEtaSeconds", { sec: Math.max(1, Math.round(((100 - pct) / 100) * 30)) })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            failed ? "bg-[var(--danger)]" : "bg-[var(--primary)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="flex flex-col gap-2.5">
        {ORDER.map((stage, i) => {
          const isDone = i < currentIdx || (i === currentIdx && completed);
          const isRunning = i === currentIdx && !completed && !failed;
          const isPending = i > currentIdx;
          const isFailed = failed && i === currentIdx;
          return (
            <li
              key={stage}
              className="flex items-start gap-3 border-b border-[var(--border)] py-2.5 last:border-b-0"
            >
              <span
                className={cn(
                  "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border font-mono text-[11px] font-semibold",
                  isDone &&
                    "border-[var(--success-border)] bg-[var(--success-tint)] text-[var(--success)]",
                  isRunning &&
                    "border-[var(--info-border)] bg-[var(--info-tint)] text-[var(--info)]",
                  isFailed &&
                    "border-[var(--danger-border)] bg-[var(--danger-tint)] text-[var(--danger)]",
                  isPending &&
                    "border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-faint)]",
                )}
              >
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : isRunning ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isFailed ? (
                  <TriangleAlert className="h-3 w-3" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="flex flex-1 flex-col">
                <div className="flex items-center">
                  <div className="text-[13px] font-medium">
                    {t(TITLE_KEY[i] ?? "document.stage1Title")}
                  </div>
                  <div className="flex-1" />
                  {isRunning ? <span className="chip chip-info">идёт</span> : null}
                  {isDone ? (
                    <span className="chip chip-success px-1.5">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--text-subtle)]">
                  {t(`document.stage.${stage}`)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {failed && job.error ? (
        <div className="mt-3 flex items-start gap-2 text-[12.5px] text-[var(--danger)]">
          <Info className="h-3.5 w-3.5 mt-0.5" />
          <span>{job.error}</span>
        </div>
      ) : null}
    </div>
  );
}
