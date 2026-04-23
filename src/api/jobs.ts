import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type {
  BatchRequest,
  Job,
  JobItem,
  JobItemStatus,
  JobStatus,
} from "./types";

const TERMINAL_JOB: ReadonlySet<JobStatus> = new Set([
  "completed",
  "partial",
  "failed",
  "cancelled",
]);

export interface BatchSubmitResponse {
  job_id: string;
  status: JobStatus;
  total_items: number;
  poll_url?: string;
  events_url?: string;
}

export function useClassifyBatch() {
  return useMutation({
    mutationFn: async (req: BatchRequest & { idempotencyKey?: string }) => {
      const { idempotencyKey, ...body } = req;
      return apiFetch<BatchSubmitResponse>("/api/v1/classify/batch", {
        method: "POST",
        body,
        idempotencyKey,
      });
    },
  });
}

export function useJob(jobId: string | null, pollMs = 3000) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => apiFetch<Job>(`/api/v1/jobs/${encodeURIComponent(jobId ?? "")}`),
    enabled: Boolean(jobId),
    refetchInterval: (q) => {
      const data = q.state.data as Job | undefined;
      if (!data) return pollMs;
      // needs_input is a non-terminal wait state — keep polling at slower cadence.
      if (data.status === "needs_input") return pollMs * 2;
      return TERMINAL_JOB.has(data.status) ? false : pollMs;
    },
    staleTime: 0,
  });
}

export interface JobItemsResponse {
  items: JobItem[];
  next_cursor?: string | null;
}

export function useJobItems(
  jobId: string | null,
  filter?: { status?: JobItemStatus },
  pollMs = 3000,
) {
  const qs = filter?.status ? `?status=${encodeURIComponent(filter.status)}` : "";
  return useQuery({
    queryKey: ["job", jobId, "items", filter?.status ?? "all"],
    queryFn: () =>
      apiFetch<JobItemsResponse>(`/api/v1/jobs/${encodeURIComponent(jobId ?? "")}/items${qs}`),
    enabled: Boolean(jobId),
    refetchInterval: pollMs,
    staleTime: 0,
  });
}

export interface BatchAnswerPayload {
  answers: Array<{ item_id: string; answers: Record<string, string> }>;
}

export function useJobBatchAnswer(jobId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BatchAnswerPayload) => {
      if (!jobId) throw new Error("jobId is required");
      return apiFetch<Job>(`/api/v1/jobs/${encodeURIComponent(jobId)}/answers`, {
        method: "POST",
        body: payload,
      });
    },
    onSuccess: () => {
      if (!jobId) return;
      void qc.invalidateQueries({ queryKey: ["job", jobId] });
    },
  });
}

export function useJobItemAnswer(jobId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { itemId: string; answers: Record<string, string> }) => {
      if (!jobId) throw new Error("jobId is required");
      return apiFetch<Job>(
        `/api/v1/jobs/${encodeURIComponent(jobId)}/items/${encodeURIComponent(payload.itemId)}/answer`,
        { method: "POST", body: { answers: payload.answers } },
      );
    },
    onSuccess: () => {
      if (!jobId) return;
      void qc.invalidateQueries({ queryKey: ["job", jobId] });
    },
  });
}

export function useJobRetryFailed(jobId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error("jobId is required");
      return apiFetch<{ job_id: string }>(
        `/api/v1/jobs/${encodeURIComponent(jobId)}/retry-failed`,
        { method: "POST" },
      );
    },
    onSuccess: () => {
      if (!jobId) return;
      void qc.invalidateQueries({ queryKey: ["job", jobId] });
    },
  });
}

export function useJobCancel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) =>
      apiFetch<void>(`/api/v1/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE" }),
    onSuccess: (_data, jobId) => {
      void qc.invalidateQueries({ queryKey: ["job", jobId] });
    },
  });
}
