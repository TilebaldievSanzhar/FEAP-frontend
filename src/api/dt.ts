import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "./client";
import { getAuthToken } from "./auth";
import { getConfig } from "@/lib/config";
import type {
  AdviseOut,
  CatalogImportOut,
  CatalogItemIn,
  CatalogItemOut,
  CatalogListOut,
  CrosscheckOut,
  DocumentIn,
  DocumentListOut,
  DocumentOut,
  DtDraftOut,
  FixOut,
  G31Out,
  PermitCheckOut,
  ShipmentClassifyOut,
  ShipmentIn,
  ShipmentListOut,
  ShipmentOut,
} from "./dt-types";

// ────────────────────────────────────────────────────────────────────────────
// Shipments
// ────────────────────────────────────────────────────────────────────────────

export interface ShipmentListParams {
  status?: string | null;
  limit?: number;
  offset?: number;
}

export function useShipments(params: ShipmentListParams = {}) {
  const { status, limit = 50, offset = 0 } = params;
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  return useQuery({
    queryKey: ["shipments", status ?? "all", limit, offset],
    queryFn: () => apiFetch<ShipmentListOut>(`/api/v1/shipments?${qs.toString()}`),
  });
}

export function useShipment(shipmentId: string | null) {
  return useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () =>
      apiFetch<ShipmentOut>(`/api/v1/shipments/${encodeURIComponent(shipmentId ?? "")}`),
    enabled: Boolean(shipmentId),
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ShipmentIn) =>
      apiFetch<ShipmentOut>("/api/v1/shipments", { method: "POST", body: payload }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["shipments"] }),
  });
}

export function useUpdateShipment(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ShipmentIn) =>
      apiFetch<ShipmentOut>(`/api/v1/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PUT",
        body: payload,
      }),
    onSuccess: (data) => {
      qc.setQueryData(["shipment", shipmentId], data);
      void qc.invalidateQueries({ queryKey: ["shipments"] });
    },
  });
}

export function useDeleteShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      apiFetch<void>(`/api/v1/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "DELETE",
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["shipments"] }),
  });
}

export function useCloneShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      apiFetch<ShipmentOut>(`/api/v1/shipments/${encodeURIComponent(shipmentId)}/clone`, {
        method: "POST",
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["shipments"] }),
  });
}

export function useClassifyShipment(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { force?: boolean } = {}) =>
      apiFetch<ShipmentClassifyOut>(
        `/api/v1/shipments/${encodeURIComponent(shipmentId)}/classify${opts.force ? "?force=true" : ""}`,
        { method: "POST" },
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["shipment", shipmentId] }),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// DT drafts
// ────────────────────────────────────────────────────────────────────────────

export function useGenerateDraft(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<DtDraftOut>(`/api/v1/shipments/${encodeURIComponent(shipmentId)}/dt-draft`, {
        method: "POST",
      }),
    onSuccess: (draft) => {
      qc.setQueryData(["dt-draft", draft.id], draft);
      void qc.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      void qc.invalidateQueries({ queryKey: ["shipments"] });
    },
  });
}

export function useDraft(draftId: string | null) {
  return useQuery({
    queryKey: ["dt-draft", draftId],
    queryFn: () =>
      apiFetch<DtDraftOut>(`/api/v1/dt-drafts/${encodeURIComponent(draftId ?? "")}`),
    enabled: Boolean(draftId),
  });
}

export type ExportFormat = "xlsx" | "pdf" | "xml";

/**
 * Download an export with the auth header. Errors (422 XSD, 501 no font)
 * are surfaced as ApiError with the backend's detail payload.
 */
export async function downloadDraftExport(draftId: string, format: ExportFormat): Promise<void> {
  const { apiBaseUrl } = getConfig();
  const headers = new Headers();
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(
    `${apiBaseUrl}/api/v1/dt-drafts/${encodeURIComponent(draftId)}/export.${format}`,
    { headers },
  );
  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = await res.text().catch(() => null);
    }
    throw new ApiError(res.status, payload);
  }

  const disposition = res.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? `dt_draft.${format}`;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useFixSuggestions(draftId: string | null) {
  return useMutation({
    mutationFn: () => {
      if (!draftId) throw new Error("draftId is required");
      return apiFetch<FixOut>(
        `/api/v1/dt-drafts/${encodeURIComponent(draftId)}/fix-suggestions`,
        { method: "POST" },
      );
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Catalog
// ────────────────────────────────────────────────────────────────────────────

export function useCatalog(params: { q?: string; limit?: number; offset?: number } = {}) {
  const { q, limit = 50, offset = 0 } = params;
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  return useQuery({
    queryKey: ["catalog", q ?? "", limit, offset],
    queryFn: () => apiFetch<CatalogListOut>(`/api/v1/catalog?${qs.toString()}`),
  });
}

export function useCatalogSuggest(q: string) {
  return useQuery({
    queryKey: ["catalog-suggest", q],
    queryFn: () =>
      apiFetch<CatalogListOut>(`/api/v1/catalog/suggest?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    staleTime: 15_000,
  });
}

export function useUpsertCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CatalogItemIn) =>
      apiFetch<CatalogItemOut>("/api/v1/catalog", { method: "POST", body: payload }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["catalog"] }),
  });
}

export function useDeleteCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<void>(`/api/v1/catalog/${encodeURIComponent(itemId)}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["catalog"] }),
  });
}

export function useImportCatalogFromShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      apiFetch<CatalogImportOut>(
        `/api/v1/catalog/import-from-shipment/${encodeURIComponent(shipmentId)}`,
        { method: "POST" },
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["catalog"] }),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Shipment documents
// ────────────────────────────────────────────────────────────────────────────

export function useShipmentDocuments(shipmentId: string | null) {
  return useQuery({
    queryKey: ["shipment", shipmentId, "documents"],
    queryFn: () =>
      apiFetch<DocumentListOut>(
        `/api/v1/shipments/${encodeURIComponent(shipmentId ?? "")}/documents`,
      ),
    enabled: Boolean(shipmentId),
  });
}

export function useAttachDocument(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DocumentIn) =>
      apiFetch<DocumentOut>(`/api/v1/shipments/${encodeURIComponent(shipmentId)}/documents`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["shipment", shipmentId, "documents"] }),
  });
}

export function useDeleteDocument(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) =>
      apiFetch<void>(
        `/api/v1/shipments/${encodeURIComponent(shipmentId)}/documents/${encodeURIComponent(docId)}`,
        { method: "DELETE" },
      ),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["shipment", shipmentId, "documents"] }),
  });
}

export function useExtractDocument(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { docId: string; kind?: string }) =>
      apiFetch<DocumentOut>(
        `/api/v1/shipments/${encodeURIComponent(shipmentId)}/documents/${encodeURIComponent(payload.docId)}/extract${payload.kind ? `?kind=${encodeURIComponent(payload.kind)}` : ""}`,
        { method: "POST" },
      ),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["shipment", shipmentId, "documents"] }),
  });
}

export function useVerifyPermit(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { docId: string; force?: boolean }) =>
      apiFetch<PermitCheckOut>(
        `/api/v1/shipments/${encodeURIComponent(shipmentId)}/documents/${encodeURIComponent(payload.docId)}/verify-permit${payload.force ? "?force=true" : ""}`,
        { method: "POST" },
      ),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["shipment", shipmentId, "documents"] }),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Checks (LLM by the edges)
// ────────────────────────────────────────────────────────────────────────────

export function useCrosscheck(shipmentId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<CrosscheckOut>(
        `/api/v1/shipments/${encodeURIComponent(shipmentId)}/crosscheck`,
        { method: "POST" },
      ),
  });
}

export function useAdvise(shipmentId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<AdviseOut>(`/api/v1/shipments/${encodeURIComponent(shipmentId)}/advise`, {
        method: "POST",
      }),
  });
}

export function useDescribe31(shipmentId: string) {
  return useMutation({
    mutationFn: (position: number) =>
      apiFetch<G31Out>(
        `/api/v1/shipments/${encodeURIComponent(shipmentId)}/items/${position}/describe31`,
        { method: "POST" },
      ),
  });
}
