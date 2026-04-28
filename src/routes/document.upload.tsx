import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, FileText, Info, TriangleAlert, Zap } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { DocumentDropzone } from "@/components/document/DocumentDropzone";
import { StatusChip } from "@/components/shared/StatusChip";

import { useOcrUpload } from "@/api/ocr";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { parseApiError } from "@/lib/errors";
import { getConfig } from "@/lib/config";

const RECENT = [
  { name: "Spec_CN_0412.xlsx", time: "вчера", status: "completed" as const, count: "28 поз." },
  { name: "Invoice_0408.pdf", time: "3 дня назад", status: "completed" as const, count: "12 поз." },
  { name: "Draft_contract.pdf", time: "1 нед. назад", status: "draft" as const, count: "—" },
];

const TIPS = [
  { ok: true, text: "Текстовый PDF распознаётся точнее сканов" },
  { ok: true, text: "Одна товарная позиция — одна строка таблицы" },
  { ok: true, text: "Колонки: описание, количество, ед., цена" },
  { ok: false, text: "Избегайте фото под углом и бликов" },
];

function DocumentUploadPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = getConfig();
  const idempotency = useIdempotencyKey();

  const [file, setFile] = useState<File | null>(null);
  const [autoClassify, setAutoClassify] = useState(false);
  const [mergeDuplicates, setMergeDuplicates] = useState(true);

  const upload = useOcrUpload();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    try {
      const res = await upload.mutateAsync({
        file,
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
    <AppShell crumbs={[t("shell.crumbDocuments"), t("shell.crumbNew")]}>
      <header className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("document.heading")}
        </h1>
        <p className="mt-1 max-w-[640px] text-sm text-[var(--text-muted)]">
          {t("document.headingHint")}
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-xs)]"
        >
          <DocumentDropzone
            file={file}
            onFileChange={setFile}
            maxSizeMb={config.ocrMaxFileMb}
            disabled={submitting}
          />

          {file ? <div className="my-1 h-px bg-[var(--border)]" /> : null}

          <label className="flex items-center gap-2 text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={autoClassify}
              onChange={(e) => setAutoClassify(e.target.checked)}
              disabled={submitting}
            />
            <span>
              {t("document.autoClassify")}
              <span className="ml-1.5 text-[11.5px] text-[var(--text-subtle)]">
                ({t("document.autoClassifyHint")})
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={mergeDuplicates}
              onChange={(e) => setMergeDuplicates(e.target.checked)}
              disabled={submitting}
            />
            <span>{t("document.mergeDuplicates")}</span>
          </label>

          <div className="my-1 h-px bg-[var(--border)]" />

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-[12px] text-[var(--text-subtle)]">
              <Info className="mr-1 inline h-3 w-3 -translate-y-px" />
              {t("document.etaHint")}
            </div>
            <Button type="submit" size="lg" disabled={!file || submitting}>
              <Zap className="h-4 w-4" />
              {submitting ? t("actions.submitting") : t("document.startProcessing")}
            </Button>
          </div>
        </form>

        <aside className="flex flex-col gap-3">
          <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-5 shadow-[var(--shadow-xs)]">
            <div className="kicker mb-2.5">{t("document.tipsTitle")}</div>
            <ul className="flex flex-col gap-2.5 text-[12.5px] text-[var(--text-muted)]">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  {tip.ok ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--success)] mt-0.5" />
                  ) : (
                    <TriangleAlert className="h-3 w-3 shrink-0 text-[var(--warn-strong)] mt-0.5" />
                  )}
                  <span>{tip.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
              {t("document.recentTitle")}
            </div>
            <ul>
              {RECENT.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px]"
                  style={{
                    borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <FileText className="h-3.5 w-3.5 text-[var(--text-faint)]" />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-[11.5px] text-[var(--text-subtle)]">
                      {r.time} · {r.count}
                    </span>
                  </div>
                  <StatusChip status={r.status} showIcon={false} />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/document/upload")({
  component: DocumentUploadPage,
});
