import { useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { OcrProgressPanel } from "@/components/document/OcrProgressPanel";
import { ExtractedProductsTable } from "@/components/document/ExtractedProductsTable";

import { useOcrJob } from "@/api/ocr";
import { useClassifyBatch } from "@/api/jobs";
import { useDraftStore, type DraftProduct } from "@/stores/draft";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { parseApiError } from "@/lib/errors";

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
            p.quantity != null
              ? `${p.quantity}${p.unit ? ` ${p.unit}` : ""}`
              : undefined,
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
  const includedCount = useMemo(
    () => products.filter((p) => !p.skipped).length,
    [products],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !ocrJob) {
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

  const isDone = ocrJob.status === "completed";

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("document.reviewTitle")}</CardTitle>
          <CardDescription>
            {t("document.ocrJobId")}: <span className="font-mono">{ocrJob.ocr_job_id}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OcrProgressPanel job={ocrJob} />
        </CardContent>
      </Card>

      {isDone ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{t("document.extractedTitle")}</CardTitle>
                <CardDescription>{t("document.extractedDescription")}</CardDescription>
              </div>
              {products.length ? (
                <Button
                  onClick={launchBatch}
                  disabled={classifyBatch.isPending || includedCount === 0}
                >
                  {classifyBatch.isPending
                    ? t("actions.submitting")
                    : t("document.launchBatch", { count: includedCount })}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <ExtractedProductsTable ocrJobId={ocrJobId} products={products} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/document/$ocrJobId/review")({
  component: ReviewPage,
});
