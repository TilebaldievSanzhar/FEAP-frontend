import { getConfig } from "@/lib/config";
import { getAuthToken, onUnauthorized } from "./auth";

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  body?: unknown;
  idempotencyKey?: string;
  /** Opt out of Authorization header for a specific call. */
  anonymous?: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;
  readonly requestId?: string;

  constructor(status: number, payload: unknown, requestId?: string) {
    super(extractMessage(payload) ?? `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.requestId = requestId;
  }
}

function extractMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as Record<string, unknown>;
  if (typeof p.detail === "string") return p.detail;
  if (typeof p.message === "string") return p.message;
  if (Array.isArray(p.detail)) {
    const first = p.detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
  }
  return undefined;
}

export async function apiFetch<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { apiBaseUrl } = getConfig();
  const url = `${apiBaseUrl}${path}`;
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  if (!init.anonymous) {
    const token = getAuthToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let body: BodyInit | undefined;
  if (init.body instanceof FormData) {
    body = init.body;
  } else if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }

  if (init.idempotencyKey && (init.method ?? "GET") !== "GET") {
    headers.set("Idempotency-Key", init.idempotencyKey);
  }

  const res = await fetch(url, { ...init, headers, body });
  const requestId = res.headers.get("x-request-id") ?? undefined;

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = await res.text().catch(() => null);
    }
    if (res.status === 401) onUnauthorized();
    throw new ApiError(res.status, payload, requestId);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return (await res.text()) as T;
  }
  return (await res.json()) as T;
}

/**
 * Absolute URL for an SSE endpoint. Native EventSource cannot send an
 * Authorization header, so the token travels as ?access_token= (the backend
 * accepts it on /jobs/{id}/events and checks the owner org).
 */
export function sseUrl(path: string): string {
  const { apiBaseUrl } = getConfig();
  const token = getAuthToken();
  if (!token) return `${apiBaseUrl}${path}`;
  const sep = path.includes("?") ? "&" : "?";
  return `${apiBaseUrl}${path}${sep}access_token=${encodeURIComponent(token)}`;
}

export function streamSse(
  path: string,
  handlers: {
    onMessage?: (event: MessageEvent) => void;
    onEvent?: Record<string, (event: MessageEvent) => void>;
    onError?: (event: Event) => void;
  },
): () => void {
  const { sseEnabled } = getConfig();
  if (!sseEnabled) return () => undefined;

  const es = new EventSource(sseUrl(path));
  if (handlers.onMessage) es.onmessage = handlers.onMessage;
  if (handlers.onError) es.onerror = handlers.onError;
  if (handlers.onEvent) {
    for (const [name, handler] of Object.entries(handlers.onEvent)) {
      es.addEventListener(name, handler as EventListener);
    }
  }
  return () => es.close();
}