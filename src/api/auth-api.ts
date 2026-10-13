import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { LoginIn, MeOut, RegisterIn, TokenOut } from "./dt-types";

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginIn) =>
      apiFetch<TokenOut>("/api/v1/auth/login", {
        method: "POST",
        body: payload,
        anonymous: true,
      }),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterIn) =>
      apiFetch<TokenOut>("/api/v1/auth/register", {
        method: "POST",
        body: payload,
        anonymous: true,
      }),
  });
}

export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<MeOut>("/api/v1/auth/me"),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useSwitchOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) =>
      apiFetch<TokenOut>("/api/v1/auth/switch-org", {
        method: "POST",
        body: { org_id: orgId },
      }),
    onSuccess: () => {
      // Everything is org-scoped — drop the whole cache after the switch.
      qc.clear();
    },
  });
}
