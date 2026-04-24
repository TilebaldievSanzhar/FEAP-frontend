import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Activity, Download, RadioTower } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { JobProgressBar } from "@/components/jobs/JobProgressBar";
import { JobItemsList } from "@/components/jobs/JobItemsList";
import { BatchAnswerDialog } from "@/components/jobs/BatchAnswerDialog";
import { useJobLive } from "@/components/jobs/useJobLive";

import { useJobBatchAnswer } from "@/api/jobs";
import type { JobItem, JobItemStatus } from "@/api/types";
import { parseApiError } from "@/lib/errors";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatRate } from "@/lib/format";
import { cn } from "@/lib/utils";

const CSV_COLUMNS = [
  "position",
  "status",
  "description",
  "final_code",
  "code_formatted",
  "name",
  "duty_rate",
  "vat_rate",
  "excise_rate",
  "confidence",
  "requires_review",
  "error",
];

function buildCsvRows(items: JobItem[]) {
  return items.map((item) => ({
    position: item.position + 1,
    status: item.status,
    description: item.product_description,
    final_code: item.result?.final_code ?? "",
    code_formatted: item.result?.code_formatted ?? "",
    name: item.result?.code_description ?? "",
    duty_rate: formatRate(item.result?.duty_rate),
    vat_rate: formatRate(item.result?.vat_rate),
    excise_rate: formatRate(item.result?.excise_rate),
    confidence:
      item.result?.confidence != null
        ? `${Math.round(item.result.confidence * 100)}%`
        : "",
    requires_review: item.result?.requires_human_review ? "1" : "",
    error: item.error ?? "",
  }));
}

function ResultsPage() {
  const { t } = useTranslation();
  const { jobId } = Route.useParams();

  const [filter, setFilter] = useState<JobItemStatus | null>(null);
  const [answerOpen, setAnswerOpen] = useState(false);

  const live = useJobLive(jobId, filter ? { filter: { status: filter } } : undefined);
  const job = live.job;
  const allItems = live.items;
  const itemsLoading = live.itemsQuery.isLoading;

  const batchAnswer = useJobBatchAnswer(jobId);

  const needsInputItems = useMemo(
    () => allItems?.filter((i) => i.status === "needs_input") ?? [],
    [allItems],
  );

  if (live.isLoading && !job) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (live.isError || !job) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("errors.generic")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <Link to="/document/upload" className="underline">
            {t("document.backToUpload")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function onAnswerBatch(
    payload: Array<{ item_id: string; answers: Record<string, string> }>,
  ) {
    try {
      await batchAnswer.mutateAsync({ answers: payload });
      setAnswerOpen(false);
      toast.success(t("jobs.answersSent"));
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message);
    }
  }

  function onExport() {
    const rows = buildCsvRows(allItems ?? []);
    if (!rows.length) {
      toast.info(t("jobs.exportEmpty"));
      return;
    }
    downloadCsv(`job-${jobId}.csv`, toCsv(rows, CSV_COLUMNS));
  }

  const hasNeedsInput = needsInputItems.length > 0;
  const liveBadge = (() => {
    switch (live.liveStatus) {
      case "open":
        return { Icon: RadioTower, label: t("jobs.liveSse"), tone: "text-emerald-600" };
      case "connecting":
        return { Icon: RadioTower, label: t("jobs.liveConnecting"), tone: "text-muted-foreground" };
      case "polling":
        return { Icon: Activity, label: t("jobs.livePolling"), tone: "text-sky-600" };
      case "closed":
        return null;
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{t("jobs.title")}</CardTitle>
              <CardDescription>
                {t("jobs.jobId")}: <span className="font-mono">{job.job_id}</span>
              </CardDescription>
            </div>
            {liveBadge ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs",
                  liveBadge.tone,
                )}
                title={liveBadge.label}
              >
                <liveBadge.Icon className="h-3 w-3" aria-hidden />
                {liveBadge.label}
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <JobProgressBar job={job} activeFilter={filter} onFilterChange={setFilter} />

          <div className="flex flex-wrap gap-2">
            {hasNeedsInput ? (
              <Button onClick={() => setAnswerOpen(true)} disabled={batchAnswer.isPending}>
                {t("jobs.openBatchAnswer", { count: needsInputItems.length })}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={onExport}
              disabled={!allItems?.length}
            >
              <Download className="h-4 w-4" />
              {t("jobs.exportCsv")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <JobItemsList items={allItems} isLoading={itemsLoading} filter={filter} />

      <BatchAnswerDialog
        open={answerOpen}
        onOpenChange={setAnswerOpen}
        items={needsInputItems}
        onSubmit={onAnswerBatch}
        submitting={batchAnswer.isPending}
      />
    </div>
  );
}

export const Route = createFileRoute("/document/$jobId/results")({
  component: ResultsPage,
});
