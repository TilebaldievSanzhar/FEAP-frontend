import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleDot, Clock, Loader2, TriangleAlert, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ClassificationStatusBadge } from "@/components/classify/ClassificationStatusBadge";
import type { Job, JobItemStatus } from "@/api/types";
import { cn } from "@/lib/utils";

interface Props {
  job: Job;
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
}> = [
  {
    key: "completed",
    status: "completed",
    i18nKey: "status.completed",
    Icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "needs_input",
    status: "needs_input",
    i18nKey: "status.needs_input",
    Icon: TriangleAlert,
    className: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "failed",
    status: "failed",
    i18nKey: "status.failed",
    Icon: XCircle,
    className: "text-destructive",
  },
  {
    key: "running",
    status: "running",
    i18nKey: "status.running",
    Icon: Loader2,
    className: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "pending",
    status: "pending",
    i18nKey: "status.pending",
    Icon: Clock,
    className: "text-muted-foreground",
  },
];

export function JobProgressBar({ job, activeFilter, onFilterChange }: Props) {
  const { t } = useTranslation();
  const { progress } = job;
  const total = progress.total || 1;
  const done = progress.completed + progress.failed + progress.needs_input;
  const pct = Math.min(100, Math.round((done / total) * 100));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t("jobs.progressTitle")}</span>
          <ClassificationStatusBadge status={job.status} />
        </div>
        <div className="font-mono text-sm text-muted-foreground">
          {done} / {progress.total}
        </div>
      </div>

      <Progress value={pct} />

      <div className="flex flex-wrap gap-2">
        {CHIPS.map(({ key, status, i18nKey, Icon, className }) => {
          const count = progress[key];
          const active = activeFilter === status;
          const clickable = Boolean(onFilterChange);
          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() => onFilterChange?.(active ? null : status)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                active
                  ? "border-foreground/60 bg-foreground/10"
                  : "border-transparent bg-muted hover:bg-muted/80",
                !clickable && "cursor-default",
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5",
                  className,
                  key === "running" && "animate-spin",
                )}
                aria-hidden
              />
              <span>{t(i18nKey)}</span>
              <span className="font-mono">{count}</span>
            </button>
          );
        })}
        {activeFilter ? (
          <button
            type="button"
            onClick={() => onFilterChange?.(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80"
          >
            <CircleDot className="h-3.5 w-3.5" aria-hidden />
            <span>{t("jobs.clearFilter")}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
