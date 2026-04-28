import { useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Clock, Download, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/shared/StatusChip";

import { OcrProgressPanel } from "@/components/document/OcrProgressPanel";
import { ExtractedProductsTable } from "@/components/document/ExtractedProductsTable";

import { useOcrJob } from "@/api/ocr";
import { useClassifyBatch } from "@/api/jobs";
import { useDraftStore, type DraftProduct, computeDraftDiff } from "@/stores/draft";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";

function toBatchItems(products: DraftProduct[]) {
  return products
    .filter((p) => !p.skipped && p.normalized_description?.trim())
    .map((p, idx) => {
      const extra = Object.fromEntries(
        Object.entries({
          Страна: p.country_of_origin ?? undefined,
          Материал: p.material ?? undefined,
          Функция: p.function ?? undefined,
          Количество:
            p.quantity != null ? `${p.quantity}${p.unit ? ` ${p.unit}` : ""}` : undefined,
          Подсказка: p.hs_code_hint ?? undefined,
        }).filter(([, v]) => v != null && v !== ""),
      ) as Record<string, string>;

      return {
        description: p.normalized_description,
        source_ref: { ocr_line_number: idx + 1, draft_id: p.local_id },
        ...(Object.keys(extra).length ? { additional_info: extra } : {}),
      };
    });
}

function ReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ocrJobId } = Route.useParams();
  const { data: ocrJob, isLoading, isError } = useOcrJob(ocrJobId);
  const classifyBatch = useClassifyBatch();
  const idempotency = useIdempotencyKey();

  const initDraft = useDraftStore((s) => s.initDraft);
  const clearDraft = useDraftStore((s) => s.clearDraft);
  const draft = useDraftStore((s) => s.byOcrJob[ocrJobId]);

  const ocrProducts = ocrJob?.result?.products;

  useEffect(() => {
    if (ocrProducts && !draft) {
      initDraft(ocrJobId, ocrProducts);
    }
  }, [ocrProducts, draft, ocrJobId, initDraft]);

  useEffect(() => {
    if (ocrJob?.linked_classification_job_id) {
      void navigate({
        to: "/document/$jobId/results",
        params: { jobId: ocrJob.linked_classification_job_id },
      });
    }
  }, [ocrJob?.linked_classification_job_id, navigate]);

  const products = useMemo(() => draft?.current ?? [], [draft]);
  const includedCount = useMemo(() => products.filter((p) => !p.skipped).length, [products]);
  const skippedCount = products.length - includedCount;
  const diff = useMemo(() => computeDraftDiff(draft), [draft]);

  if (isLoading) {
    return (
      <AppShell crumbs={[t("shell.crumbDocuments")]}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (isError || !ocrJob) {
    return (
      <AppShell crumbs={[t("shell.crumbDocuments")]}>
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

  const isDone = ocrJob.status === "completed";
  const docName = (ocrJob.result?.ocr_data?.filename as string) ?? "Документ.pdf";

  async function launchBatch() {
    if (!includedCount) return;
    try {
      const res = await classifyBatch.mutateAsync({
        items: toBatchItems(products),
        mode: "async",
        idempotencyKey: idempotency.key,
      });
      idempotency.reset();
      clearDraft(ocrJobId);
      void navigate({
        to: "/document/$jobId/results",
        params: { jobId: res.job_id },
      });
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message);
    }
  }

  const status = isDone ? "completed" : ocrJob.status === "failed" ? "failed" : "running";

  return (
    <AppShell crumbs={[t("shell.crumbDocuments"), docName, isDone ? t("shell.crumbReview") : ""]}>
      <header className="mb-6 flex items-start gap-4">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <StatusChip status={status} />
            <span className="chip chip-outline font-mono">
              ocr_{ocrJob.ocr_job_id.slice(0, 8)}…
            </span>
            {isDone ? (
              <span className="chip chip-outline">
                <Clock className="h-2.5 w-2.5" />
                OCR 18.2 с
              </span>
            ) : null}
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight">
            {isDone ? t("document.reviewHeading") : docName}
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            {isDone ? t("document.reviewSubtitle") : t("document.ocrSubtitle")}
          </p>
        </div>
        {isDone && products.length ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm">
              <Download className="h-4 w-4" />
              {t("document.exportCsv")}
            </Button>
            <Button
              size="lg"
              onClick={launchBatch}
              disabled={classifyBatch.isPending || includedCount === 0}
            >
              <Sparkles className="h-4 w-4" />
              {classifyBatch.isPending
                ? t("actions.submitting")
                : t("document.launchBatch", { count: includedCount })}
            </Button>
          </div>
        ) : null}
      </header>

      {!isDone ? (
        <OcrProgressPanel job={ocrJob} />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-7 rounded-[var(--r-lg)] border border-[var(--border)] bg-card px-5 py-3.5 shadow-[var(--shadow-xs)]">
            <div>
              <div className="kicker">{t("document.summaryTotal")}</div>
              <div className="text-[20px] font-semibold">{products.length}</div>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div>
              <div className="kicker">{t("document.summaryIncluded")}</div>
              <div className="text-[20px] font-semibold text-[var(--success)]">
                {includedCount}
              </div>
            </div>
            <div>
              <div className="kicker">{t("document.summarySkipped")}</div>
              <div className="text-[20px] font-semibold text-[var(--text-subtle)]">
                {skippedCount}
              </div>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div className="flex flex-col">
              <div className="kicker">{t("document.summaryEdited")}</div>
              <div
                className={cn(
                  "mt-1 text-[13px] text-[var(--text-muted)]",
                  diff.changed > 0 && "font-medium",
                )}
              >
                {diff.changed > 0 ? (
                  <span className="chip chip-primary">
                    {t("document.draftDirty", {
                      changed: diff.changed,
                      removed: diff.removed,
                      added: diff.added,
                    })}
                  </span>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          <ExtractedProductsTable ocrJobId={ocrJobId} products={products} />
        </>
      )}
    </AppShell>
  );
}

export const Route = createFileRoute("/document/$ocrJobId/review")({
  component: ReviewPage,
});
