import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { NtmMeasure, NtmVerifiedMeasure } from "./types";

export function useNtm(code: string | null) {
  return useQuery({
    queryKey: ["ntm", code],
    queryFn: () =>
      apiFetch<NtmMeasure[]>(`/api/v1/ntm/${encodeURIComponent(code ?? "")}`),
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
    mutationFn: async (req: NtmVerifyRequest) =>
      apiFetch<NtmVerifiedMeasure[]>("/api/v1/ntm/verify", {
        method: "POST",
        body: req,
      }),
  });
}
