import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { adaptCodeLookup, adaptTreeNode } from "./adapters";
import type { components } from "./types.generated";
import type { TnvedCodeInfo, TnvedNode } from "./types";

type BackendTreeNode = components["schemas"]["TnvedNodeResponse"];
type BackendCodeLookup = components["schemas"]["CodeLookupResponse"];

export function useTreeNode(parentCode: string | null) {
  return useQuery({
    queryKey: ["tnved", "tree", parentCode ?? "root"],
    queryFn: async (): Promise<TnvedNode[]> => {
      const qs = parentCode
        ? `?parent_code=${encodeURIComponent(parentCode)}`
        : "";
      const raw = await apiFetch<BackendTreeNode[]>(`/api/v1/tnved/tree${qs}`);
      return raw.map(adaptTreeNode);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCodeLookup(code: string | null) {
  return useQuery({
    queryKey: ["tnved", "lookup", code],
    queryFn: async (): Promise<TnvedCodeInfo> => {
      const raw = await apiFetch<BackendCodeLookup>(
        `/api/v1/tnved/lookup/${encodeURIComponent(code ?? "")}`,
      );
      return adaptCodeLookup(raw);
    },
    enabled: Boolean(code && code.replace(/\D/g, "").length >= 2),
    staleTime: 5 * 60 * 1000,
  });
}