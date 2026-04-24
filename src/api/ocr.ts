import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { adaptOcrJob } from "./adapters";
import type { components } from "./types.generated";
import type { OcrJob, OcrStatus } from "./types";

type BackendOcrJob = components["schemas"]["OcrJobResponse"];
type BackendOcrSubmit = components["schemas"]["OcrJobSubmitResponse"];

const TERMINAL_OCR: ReadonlySet<OcrStatus> = new Set(["completed", "failed", "cancelled"]);

export interface OcrUploadInput {
  file: File;
  autoClassify?: boolean;
  idempotencyKey?: string;
}

export interface OcrUploadResponse {
  ocr_job_id: string;
  status: OcrStatus;
  files_count: number;
  auto_classify: boolean;
  poll_url: string;
}

export function useOcrUpload() {
  return useMutation({
    mutationFn: async (input: OcrUploadInput): Promise<OcrUploadResponse> => {
      const fd = new FormData();
      // Backend expects the `files` field (multi-file, array-style).
      fd.append("files", input.file, input.file.name);
      if (input.autoClassify != null) fd.append("auto_classify", String(input.autoClassify));
      const raw = await apiFetch<BackendOcrSubmit>("/api/v1/ocr/jobs", {
        method: "POST",
        body: fd,
        idempotencyKey: input.idempotencyKey,
      });
      return {
        ocr_job_id: raw.ocr_job_id,
        status: raw.status,
        files_count: raw.files_count,
        auto_classify: raw.auto_classify,
        poll_url: raw.poll_url,
      };
    },
  });
}

export function useOcrJob(ocrJobId: string | null, pollMs = 2000) {
  return useQuery({
    queryKey: ["ocr-job", ocrJobId],
    queryFn: async (): Promise<OcrJob> => {
      const raw = await apiFetch<BackendOcrJob>(
        `/api/v1/ocr/jobs/${encodeURIComponent(ocrJobId ?? "")}`,
      );
      return adaptOcrJob(raw);
    },
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