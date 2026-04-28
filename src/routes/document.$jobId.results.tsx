import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Activity, Clock, HelpCircle, Pause, RadioTower, Square } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/shared/StatusChip";

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
      item.result?.confidence != null ? `${Math.round(item.result.confidence * 100)}%` : "",
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

  const counts = useMemo(() => {
    const base = { all: allItems?.length ?? 0, completed: 0, needs_input: 0, running: 0, pending: 0, failed: 0 };
    for (const it of allItems ?? []) {
      if (it.status in base) base[it.status as keyof typeof base] += 1;
    }
    return base;
  }, [allItems]);

  if (live.isLoading && !job) {
    return (
      <AppShell crumbs={[t("shell.crumbJobs")]}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (live.isError || !job) {
    return (
      <AppShell crumbs={[t("shell.crumbJobs")]}>
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-xs)]">
          <h1 className="mb-2 text-lg font-semibold">{t("errors.generic")}</h1>
          <Link
            to="/document/upload"
            className="text-[13px] text-[var(--primary)] underline-offset-2 hover:underline"
          >
            {t("document.backToUpload")}
          </Link>
        </div>
      </AppShell>
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
        return { Icon: RadioTower, label: t("jobs.liveSse"), tone: "text-[var(--success)]" };
      case "connecting":
        return { Icon: RadioTower, label: t("jobs.liveConnecting"), tone: "text-[var(--text-subtle)]" };
      case "polling":
        return { Icon: Activity, label: t("jobs.livePolling"), tone: "text-[var(--info)]" };
      default:
        return null;
    }
  })();

  return (
    <AppShell crumbs={[t("shell.crumbJobs"), `job_${job.job_id.slice(0, 8)}`]}>
      <header className="mb-6 flex items-start gap-4">
        <div className="flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <StatusChip status={job.status === "partial" ? "partial" : job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : job.status === "cancelled" ? "cancelled" : "running"} />
            <span className="chip chip-outline font-mono">job_{job.job_id.slice(0, 8)}</span>
            {job.parent_ocr_job_id ? (
              <span className="chip chip-outline">{t("jobs.fromDocument", { name: "Invoice_2026_0418.pdf" })}</span>
            ) : null}
            {job.created_at ? (
              <span className="chip chip-outline">
                <Clock className="h-2.5 w-2.5" />
                {t("jobs.startedAgo", { ago: "2 мин назад" })}
              </span>
            ) : null}
            {liveBadge ? (
              <span className={cn("chip chip-outline", liveBadge.tone)}>
                <liveBadge.Icon className="h-2.5 w-2.5" />
                {liveBadge.label}
              </span>
            ) : null}
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight">
            {t("jobs.headingClassify", { count: job.progress.total })}
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{t("jobs.headingHint")}</p>
        </div>
        <div className="flex items-center gap-2">
          {!["completed", "partial", "failed", "cancelled"].includes(job.status) ? (
            <>
              <Button type="button" variant="outline" size="sm">
                <Pause className="h-3 w-3" />
                {t("jobs.pause")}
              </Button>
              <Button type="button" variant="destructive" size="sm">
                <Square className="h-3 w-3" />
                {t("jobs.cancel")}
              </Button>
            </>
          ) : null}
          {hasNeedsInput ? (
            <Button onClick={() => setAnswerOpen(true)} disabled={batchAnswer.isPending}>
              <HelpCircle className="h-4 w-4" />
              {t("jobs.answerCount", { count: needsInputItems.length })}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onExport} disabled={!allItems?.length}>
            CSV
          </Button>
        </div>
      </header>

      <div className="mb-5">
        <JobProgressBar
          job={job}
          items={allItems}
          activeFilter={filter}
          onFilterChange={setFilter}
        />
      </div>

      <JobItemsList
        items={allItems}
        isLoading={itemsLoading}
        filter={filter}
        onFilterChange={setFilter}
        totalCounts={counts}
      />

      <BatchAnswerDialog
        open={answerOpen}
        onOpenChange={setAnswerOpen}
        items={needsInputItems}
        onSubmit={onAnswerBatch}
        submitting={batchAnswer.isPending}
      />
    </AppShell>
  );
}

export const Route = createFileRoute("/document/$jobId/results")({
  component: ResultsPage,
});
