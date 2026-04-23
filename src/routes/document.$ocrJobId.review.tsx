import { useEffect } from "react";
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
import { ExtractedProductsList } from "@/components/document/ExtractedProductsList";

import { useOcrJob } from "@/api/ocr";
import { useClassifyBatch } from "@/api/jobs";
import type { ProductCard } from "@/api/types";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { parseApiError } from "@/lib/errors";

function toBatchItems(products: ProductCard[]) {
  return products
    .filter((p) => !p.skipped && p.normalized_description?.trim())
    .map((p, idx) => ({
      description: p.normalized_description,
      source_ref: { ocr_line_number: idx + 1 },
      ...(p.country_of_origin || p.material || p.hs_code_hint
        ? {
            additional_info: Object.fromEntries(
              Object.entries({
                Страна: p.country_of_origin ?? undefined,
                Материал: p.material ?? undefined,
                Подсказка: p.hs_code_hint ?? undefined,
              }).filter(([, v]) => v != null && v !== ""),
            ) as Record<string, string>,
          }
        : {}),
    }));
}

function ReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ocrJobId } = Route.useParams();
  const { data: ocrJob, isLoading, isError } = useOcrJob(ocrJobId);
  const classifyBatch = useClassifyBatch();
  const idempotency = useIdempotencyKey();

  useEffect(() => {
    if (ocrJob?.linked_classification_job_id) {
      void navigate({
        to: "/document/$jobId/results",
        params: { jobId: ocrJob.linked_classification_job_id },
      });
    }
  }, [ocrJob?.linked_classification_job_id, navigate]);

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

  const products = ocrJob.result?.products ?? [];
  const isDone = ocrJob.status === "completed";

  async function launchBatch() {
    if (!products.length) return;
    try {
      const res = await classifyBatch.mutateAsync({
        items: toBatchItems(products),
        mode: "async",
        idempotencyKey: idempotency.key,
      });
      idempotency.reset();
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
                  disabled={classifyBatch.isPending}
                >
                  {classifyBatch.isPending
                    ? t("actions.submitting")
                    : t("document.launchBatch", {
                        count: products.filter((p) => !p.skipped).length,
                      })}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <ExtractedProductsList
              products={products}
              skippedLines={ocrJob.result?.skipped_lines}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/document/$ocrJobId/review")({
  component: ReviewPage,
});
