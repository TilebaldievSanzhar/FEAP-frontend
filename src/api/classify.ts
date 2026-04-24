import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { adaptClassifyResponse } from "./adapters";
import type { components } from "./types.generated";
import type { ClassifyRequest, ClassifyResponse } from "./types";

type BackendClassifyResponse = components["schemas"]["ClassifyResponse"];

export function useClassify() {
  return useMutation({
    mutationFn: async (req: ClassifyRequest): Promise<ClassifyResponse> => {
      const raw = await apiFetch<BackendClassifyResponse>("/api/v1/classify", {
        method: "POST",
        body: req,
      });
      return adaptClassifyResponse(raw);
    },
  });
}

export function useResume(sessionId: string | null) {
  return useMutation({
    mutationFn: async (answers: Record<string, string>): Promise<ClassifyResponse> => {
      if (!sessionId) throw new Error("session_id is required");
      const raw = await apiFetch<BackendClassifyResponse>(
        `/api/v1/classify/${encodeURIComponent(sessionId)}/answer`,
        {
          method: "POST",
          body: { answers },
        },
      );
      return adaptClassifyResponse(raw);
    },
  });
}