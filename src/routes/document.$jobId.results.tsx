import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, RefreshCcw } from "lucide-react";

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

import {
  useJob,
  useJobBatchAnswer,
  useJobItems,
  useJobRetryFailed,
} from "@/api/jobs";
import type { JobItem, JobItemStatus } from "@/api/types";
import { parseApiError } from "@/lib/errors";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatRate } from "@/lib/format";

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

  const { data: job, isLoading: jobLoading, isError: jobError } = useJob(jobId);
  const { data: itemsData, isLoading: itemsLoading } = useJobItems(
    jobId,
    filter ? { status: filter } : undefined,
  );

  const batchAnswer = useJobBatchAnswer(jobId);
  const retryFailed = useJobRetryFailed(jobId);

  const allItems = itemsData?.items;
  const needsInputItems = useMemo(
    () => allItems?.filter((i) => i.status === "needs_input") ?? [],
    [allItems],
  );

  if (jobLoading && !job) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (jobError || !job) {
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

  async function onRetryFailed() {
    try {
      const res = await retryFailed.mutateAsync();
      toast.success(t("jobs.retryQueued"));
      if (res?.job_id && res.job_id !== jobId) {
        toast.message(t("jobs.newJobCreated"), { description: res.job_id });
      }
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

  const hasFailed = job.progress.failed > 0;
  const hasNeedsInput = needsInputItems.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("jobs.title")}</CardTitle>
          <CardDescription>
            {t("jobs.jobId")}: <span className="font-mono">{job.job_id}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <JobProgressBar job={job} activeFilter={filter} onFilterChange={setFilter} />

          <div className="flex flex-wrap gap-2">
            {hasNeedsInput ? (
              <Button onClick={() => setAnswerOpen(true)} disabled={batchAnswer.isPending}>
                {t("jobs.openBatchAnswer", { count: needsInputItems.length })}
              </Button>
            ) : null}
            {hasFailed ? (
              <Button
                variant="outline"
                onClick={onRetryFailed}
                disabled={retryFailed.isPending}
              >
                <RefreshCcw className="h-4 w-4" />
                {t("jobs.retryFailed", { count: job.progress.failed })}
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
