import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DocumentDropzone } from "@/components/document/DocumentDropzone";
import { DocumentTypeSelector } from "@/components/document/DocumentTypeSelector";

import { useOcrUpload } from "@/api/ocr";
import type { DocumentType } from "@/api/types";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { parseApiError } from "@/lib/errors";
import { getConfig } from "@/lib/config";

function DocumentUploadPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = getConfig();
  const idempotency = useIdempotencyKey();

  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("unknown");
  const [autoClassify, setAutoClassify] = useState(true);

  const upload = useOcrUpload();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    try {
      const res = await upload.mutateAsync({
        file,
        documentType: documentType === "unknown" ? undefined : documentType,
        autoClassify,
        idempotencyKey: idempotency.key,
      });
      idempotency.reset();
      void navigate({
        to: "/document/$ocrJobId/review",
        params: { ocrJobId: res.ocr_job_id },
      });
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message, {
        description: parsed.requestId ? `Request ID: ${parsed.requestId}` : undefined,
      });
    }
  }

  const submitting = upload.isPending;

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("document.uploadTitle")}</CardTitle>
          <CardDescription>{t("document.uploadDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <DocumentDropzone
              file={file}
              onFileChange={setFile}
              maxSizeMb={config.ocrMaxFileMb}
              disabled={submitting}
            />

            <DocumentTypeSelector
              value={documentType}
              onChange={setDocumentType}
              disabled={submitting}
            />

            <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={autoClassify}
                onChange={(e) => setAutoClassify(e.target.checked)}
                disabled={submitting}
              />
              <span>
                <span className="font-medium">{t("document.autoClassify")}</span>
                <span className="ml-2 text-muted-foreground">
                  {t("document.autoClassifyHint")}
                </span>
              </span>
            </label>

            <div className="flex gap-2">
              <Button type="submit" disabled={!file || submitting}>
                {submitting ? t("actions.submitting") : t("document.uploadSubmit")}
              </Button>
              {file ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFile(null)}
                  disabled={submitting}
                >
                  {t("actions.reset")}
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/document/upload")({
  component: DocumentUploadPage,
});
