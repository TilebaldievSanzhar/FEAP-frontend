import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { TnvedCodeInfo, TnvedNode } from "./types";

export function useTreeNode(parentCode: string | null) {
  return useQuery({
    queryKey: ["tnved", "tree", parentCode ?? "root"],
    queryFn: () =>
      apiFetch<TnvedNode[]>(
        parentCode
          ? `/api/v1/tnved/tree/${encodeURIComponent(parentCode)}`
          : "/api/v1/tnved/tree",
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCodeLookup(code: string | null) {
  return useQuery({
    queryKey: ["tnved", "code", code],
    queryFn: () =>
      apiFetch<TnvedCodeInfo>(`/api/v1/tnved/${encodeURIComponent(code ?? "")}`),
    enabled: Boolean(code && code.replace(/\D/g, "").length >= 2),
    staleTime: 5 * 60 * 1000,
  });
}
