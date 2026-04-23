import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { ClassifyRequest, ClassifyResponse } from "./types";

export function useClassify() {
  return useMutation({
    mutationFn: async (req: ClassifyRequest) =>
      apiFetch<ClassifyResponse>("/api/v1/classify", {
        method: "POST",
        body: req,
      }),
  });
}

export function useResume(sessionId: string | null) {
  return useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      if (!sessionId) throw new Error("session_id is required");
      return apiFetch<ClassifyResponse>(
        `/api/v1/classify/${encodeURIComponent(sessionId)}/answer`,
        {
          method: "POST",
          body: { answers },
        },
      );
    },
  });
}
