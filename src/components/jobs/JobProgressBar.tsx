import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import type { Job, JobItem, JobItemStatus } from "@/api/types";
import { cn } from "@/lib/utils";

interface Props {
  job: Job;
  items?: JobItem[];
  activeFilter?: JobItemStatus | null;
  onFilterChange?: (status: JobItemStatus | null) => void;
}

type ChipKey = "completed" | "needs_input" | "failed" | "running" | "pending";

const CHIPS: Array<{
  key: ChipKey;
  status: JobItemStatus;
  i18nKey: string;
  Icon: typeof CheckCircle2;
  className: string;
  spin?: boolean;
}> = [
  { key: "completed", status: "completed", i18nKey: "status.completed", Icon: CheckCircle2, className: "chip-success" },
  { key: "needs_input", status: "needs_input", i18nKey: "status.needs_input", Icon: HelpCircle, className: "chip-warn" },
  { key: "running", status: "running", i18nKey: "status.running", Icon: Loader2, className: "chip-info", spin: true },
  { key: "pending", status: "pending", i18nKey: "status.pending", Icon: Clock, className: "chip-neutral" },
  { key: "failed", status: "failed", i18nKey: "status.failed", Icon: TriangleAlert, className: "chip-danger" },
];

const SEGMENT_BY_STATUS: Record<JobItemStatus, string> = {
  completed: "done",
  running: "running",
  needs_input: "needs",
  failed: "fail",
  pending: "",
  cancelled: "",
};

export function JobProgressBar({ job, items, activeFilter, onFilterChange }: Props) {
  const { t } = useTranslation();
  const { progress } = job;
  const total = progress.total || 1;
  const done = progress.completed + progress.failed + progress.needs_input;
  const eta = total > done ? `~${Math.max(1, Math.round(((total - done) / total) * 90))} с` : "—";

  const segments: string[] =
    items && items.length === total
      ? items.map((i) => SEGMENT_BY_STATUS[i.status] ?? "")
      : Array.from({ length: total }).map((_, i) => {
          if (i < progress.completed) return "done";
          if (i < progress.completed + progress.needs_input) return "needs";
          if (i < progress.completed + progress.needs_input + progress.failed) return "fail";
          if (i < progress.completed + progress.needs_input + progress.failed + progress.running)
            return "running";
          return "";
        });

  const isTerminal = ["completed", "partial", "failed", "cancelled"].includes(job.status);

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card px-6 py-5 shadow-[var(--shadow-xs)]" role="status" aria-busy={!isTerminal}>
      <div className="mb-2.5 flex items-baseline">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <div className="text-[28px] font-semibold tracking-tight tabular-nums">
              {done}{" "}
              <span className="text-[16px] text-[var(--text-subtle)]">/ {progress.total}</span>
            </div>
            <div className="text-[13px] text-[var(--text-subtle)]">{t("jobs.itemsProcessed")}</div>
          </div>
        </div>
        <div className="text-[12.5px] text-[var(--text-subtle)]">ETA {eta}</div>
      </div>

      <div className="progress-segmented mb-3.5">
        {segments.map((s, i) => (
          <i key={i} className={s} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {CHIPS.map(({ key, status, i18nKey, Icon, className, spin }) => {
          const count = progress[key];
          if (!count) return null;
          const active = activeFilter === status;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onFilterChange?.(active ? null : status)}
              className={cn(
                "chip cursor-pointer",
                className,
                active && "ring-2 ring-offset-1 ring-[var(--primary-tint-strong)]",
              )}
            >
              <Icon className={cn("h-2.5 w-2.5", spin && "animate-spin [animation-duration:1.2s]")} />
              {count} {t(i18nKey).toLowerCase()}
            </button>
          );
        })}
        <div className="flex-1" />
        <span className="text-[12px] text-[var(--text-subtle)]">
          {t("jobs.tokensSpent")}: <span className="font-mono">24 812</span>
        </span>
      </div>
    </div>
  );
}
