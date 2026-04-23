import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { DocumentType, OcrJob, OcrStatus } from "./types";

const TERMINAL_OCR: ReadonlySet<OcrStatus> = new Set(["completed", "failed", "cancelled"]);

export interface OcrUploadInput {
  file: File;
  documentType?: DocumentType;
  autoClassify?: boolean;
  idempotencyKey?: string;
}

export interface OcrUploadResponse {
  ocr_job_id: string;
  status: OcrStatus;
}

export function useOcrUpload() {
  return useMutation({
    mutationFn: async (input: OcrUploadInput) => {
      const fd = new FormData();
      fd.append("file", input.file, input.file.name);
      if (input.documentType) fd.append("document_type", input.documentType);
      if (input.autoClassify != null) fd.append("auto_classify", String(input.autoClassify));
      return apiFetch<OcrUploadResponse>("/api/v1/ocr/jobs", {
        method: "POST",
        body: fd,
        idempotencyKey: input.idempotencyKey,
      });
    },
  });
}

export function useOcrJob(ocrJobId: string | null, pollMs = 2000) {
  return useQuery({
    queryKey: ["ocr-job", ocrJobId],
    queryFn: () => apiFetch<OcrJob>(`/api/v1/ocr/jobs/${encodeURIComponent(ocrJobId ?? "")}`),
    enabled: Boolean(ocrJobId),
    refetchInterval: (q) => {
      const data = q.state.data as OcrJob | undefined;
      if (!data) return pollMs;
      return TERMINAL_OCR.has(data.status) ? false : pollMs;
    },
    staleTime: 0,
  });
}

export function useOcrCancel() {
  return useMutation({
    mutationFn: async (ocrJobId: string) =>
      apiFetch<void>(`/api/v1/ocr/jobs/${encodeURIComponent(ocrJobId)}`, {
        method: "DELETE",
      }),
  });
}
