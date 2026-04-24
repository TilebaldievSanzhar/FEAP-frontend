import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { OcrJob, OcrStatus } from "@/api/types";
import { cn } from "@/lib/utils";

const ORDER: OcrStatus[] = ["pending", "extracting", "structuring", "completed"];

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
  const liveMessage = failed
    ? job.error ?? t("document.ocrFailed")
    : job.progress?.message ?? t(`document.stage.${stageKey}`);

  return (
    <div
      className="space-y-3 rounded-md border p-4"
      role="status"
      aria-live="polite"
      aria-busy={!failed && job.status !== "completed"}
    >
      <div className="flex items-start gap-3">
        {failed ? (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        ) : job.status === "completed" ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
        ) : (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
        )}
        <div className="flex-1">
          <div className="font-medium">
            {failed ? t("document.ocrFailed") : t("document.ocrTitle")}
          </div>
          <div className="text-sm text-muted-foreground">{liveMessage}</div>
          {job.error ? (
            <div className="mt-1 text-sm text-destructive">{job.error}</div>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">
          {t("document.stageOf", { index, total })}
        </div>
      </div>

      <Progress value={pct} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />

      <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {ORDER.map((stage, i) => (
          <li
            key={stage}
            className={cn(
              "rounded border px-2 py-1",
              i < currentIdx
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : i === currentIdx && job.status !== "completed"
                  ? "border-primary/40 bg-primary/10"
                  : i === currentIdx && job.status === "completed"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
            )}
          >
            {t(`document.stage.${stage}`)}
          </li>
        ))}
      </ol>
    </div>
  );
}
