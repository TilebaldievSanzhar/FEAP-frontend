import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setAuthToken } from "@/api/auth";
import type { AccountOut, OrgBrief, TokenOut } from "@/api/dt-types";

interface AuthState {
  token: string | null;
  account: AccountOut | null;
  org: OrgBrief | null;
  /** Apply a login/register/switch-org response. */
  setSession: (session: TokenOut) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      account: null,
      org: null,
      setSession: (session) => {
        setAuthToken(session.access_token);
        set({ token: session.access_token, account: session.account, org: session.org });
      },
      clearSession: () => {
        setAuthToken(null);
        set({ token: null, account: null, org: null });
      },
    }),
    {
      name: "feap-auth",
      version: 1,
      onRehydrateStorage: () => (state) => {
        // Push the persisted token into the api client on app start.
        setAuthToken(state?.token ?? null);
      },
    },
  ),
);

export function isAuthenticated(): boolean {
  return Boolean(useAuthStore.getState().token);
}

const ROLE_ORDER: Record<string, number> = { viewer: 0, declarant: 1, owner: 2 };

/**
 * True when the current session can act as `min`.
 * Anonymous (AUTH_MODE=optional dev fallback) acts as owner on the backend,
 * so without a session we allow everything and let the API be the judge.
 */
export function useHasRole(min: "viewer" | "declarant" | "owner"): boolean {
  const org = useAuthStore((s) => s.org);
  if (!org) return true;
  return (ROLE_ORDER[org.role] ?? 0) >= ROLE_ORDER[min];
}
