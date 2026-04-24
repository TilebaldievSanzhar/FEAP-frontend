import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { adaptNtmMeasure, adaptNtmVerified } from "./adapters";
import type { components } from "./types.generated";
import type { NtmMeasure, NtmVerifiedMeasure } from "./types";

type BackendNtmResponse = components["schemas"]["NtmResponse"];
type BackendNtmVerifyResponse = components["schemas"]["NtmVerifyResponse"];

export function useNtm(code: string | null) {
  return useQuery({
    queryKey: ["ntm", code],
    queryFn: async (): Promise<NtmMeasure[]> => {
      const raw = await apiFetch<BackendNtmResponse>(
        `/api/v1/ntm/${encodeURIComponent(code ?? "")}`,
      );
      const measures = raw.ntm?.measures ?? [];
      return measures.map((m, idx) => adaptNtmMeasure(m, idx));
    },
    enabled: Boolean(code),
    staleTime: 5 * 60 * 1000,
  });
}

export interface NtmVerifyRequest {
  code: string;
  product_description: string;
}

export function useNtmVerify() {
  return useMutation({
    mutationFn: async (req: NtmVerifyRequest): Promise<NtmVerifiedMeasure[]> => {
      const raw = await apiFetch<BackendNtmVerifyResponse>("/api/v1/ntm/verify", {
        method: "POST",
        body: req,
      });
      const measures = raw.measures ?? [];
      return measures.map((m, idx) => adaptNtmVerified(m, idx));
    },
  });
}