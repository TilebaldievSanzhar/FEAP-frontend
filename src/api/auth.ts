/**
 * Auth middleware stub. The live backend has no auth today, so these are no-ops
 * that become active once a token is set via `setAuthToken()`.
 *
 * Wiring (future):
 *   - Login flow calls `setAuthToken(jwt)`; token lives in memory only.
 *   - Refresh flow (if used) would rotate it via the same setter.
 *   - 401 from the API → `onUnauthorized` clears the token and notifies listeners
 *     (e.g. to redirect to /login or surface a toast).
 */

let token: string | null = null;
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function getAuthToken(): string | null {
  return token;
}

export function setAuthToken(next: string | null): void {
  token = next;
}

export function clearAuthToken(): void {
  token = null;
}

/** Called by the API client whenever a request returns 401. */
export function onUnauthorized(): void {
  clearAuthToken();
  for (const listener of unauthorizedListeners) {
    try {
      listener();
    } catch {
      // swallow; listeners must not break the caller
    }
  }
}

export function addUnauthorizedListener(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}