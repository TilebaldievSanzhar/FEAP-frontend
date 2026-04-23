export interface ApiErrorDetail {
  status?: number;
  code?: string;
  message: string;
  requestId?: string;
}

export function parseApiError(error: unknown): ApiErrorDetail {
  if (!error) return { message: "Неизвестная ошибка" };
  if (typeof error === "string") return { message: error };

  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    const detail = (e.detail ?? e.error ?? e.message) as unknown;
    const status = typeof e.status === "number" ? e.status : undefined;
    const requestId = typeof e.request_id === "string" ? e.request_id : undefined;

    if (typeof detail === "string") return { status, message: detail, requestId };
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string; loc?: unknown } | undefined;
      if (first?.msg) {
        return {
          status,
          message: first.msg,
          requestId,
        };
      }
    }
    if (detail && typeof detail === "object") {
      const d = detail as Record<string, unknown>;
      if (typeof d.message === "string") return { status, message: d.message, requestId };
    }
  }

  return { message: "Сервер вернул неожиданный ответ" };
}
