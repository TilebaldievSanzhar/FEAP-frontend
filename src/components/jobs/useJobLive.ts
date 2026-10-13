import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getConfig } from "@/lib/config";
import { sseUrl } from "@/api/client";
import { useJob, useJobItems, type JobItemsResponse } from "@/api/jobs";
import type { Job, JobItem, JobItemStatus } from "@/api/types";
import { useAuthStore } from "@/stores/auth";

type LiveStatus = "idle" | "connecting" | "open" | "polling" | "closed";

interface ItemEventPayload {
  item_id?: string;
  item?: JobItem;
  status?: JobItemStatus;
}

function applyItemPatch(
  items: JobItem[] | undefined,
  payload: ItemEventPayload,
): JobItem[] | undefined {
  if (!items) return items;
  if (payload.item) {
    const idx = items.findIndex((i) => i.item_id === payload.item!.item_id);
    if (idx >= 0) {
      const next = items.slice();
      next[idx] = { ...next[idx], ...payload.item };
      return next;
    }
    return [...items, payload.item];
  }
  if (payload.item_id && payload.status) {
    return items.map((i) =>
      i.item_id === payload.item_id ? { ...i, status: payload.status! } : i,
    );
  }
  return items;
}

/**
 * Subscribes to /api/v1/jobs/{id}/events via SSE and keeps job/items caches fresh.
 * When SSE is disabled or unavailable, falls back to polling (handled by useJob/useJobItems).
 */
export function useJobLive(
  jobId: string | null,
  options?: { filter?: { status?: JobItemStatus } },
) {
  const queryClient = useQueryClient();
  const { sseEnabled, apiBaseUrl } = getConfig();
  // Reconnect when the session changes (login, logout, switch-org).
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const lastHeartbeatRef = useRef<number>(Date.now());

  // SSE connection active → reduce polling pressure on TanStack Query.
  const pollMs = sseEnabled ? 15000 : 3000;
  const job = useJob(jobId, pollMs);
  const items = useJobItems(jobId, options?.filter, pollMs);

  useEffect(() => {
    if (!jobId) return;
    if (!sseEnabled) {
      setStatus("polling");
      return;
    }

    setStatus("connecting");
    const es = new EventSource(sseUrl(`/api/v1/jobs/${encodeURIComponent(jobId)}/events`));
    let closed = false;

    function refreshJob() {
      void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    }

    function patchItem(e: MessageEvent) {
      try {
        const payload = JSON.parse(e.data) as ItemEventPayload;
        queryClient.setQueriesData(
          { queryKey: ["job", jobId, "items"] },
          (old: JobItemsResponse | undefined) => {
            if (!old) return old;
            return { ...old, items: applyItemPatch(old.items, payload) ?? old.items };
          },
        );
      } catch {
        void queryClient.invalidateQueries({ queryKey: ["job", jobId, "items"] });
      }
    }

    es.onopen = () => {
      setStatus("open");
      lastHeartbeatRef.current = Date.now();
    };
    es.onerror = () => {
      if (closed) return;
      setStatus("polling");
      es.close();
    };

    es.addEventListener("progress", () => {
      lastHeartbeatRef.current = Date.now();
      refreshJob();
    });
    es.addEventListener("item_done", (e) => {
      lastHeartbeatRef.current = Date.now();
      patchItem(e as MessageEvent);
      // aggregate counts live on the job
      refreshJob();
    });
    es.addEventListener("item_needs_input", (e) => {
      lastHeartbeatRef.current = Date.now();
      patchItem(e as MessageEvent);
      refreshJob();
    });
    es.addEventListener("item_failed", (e) => {
      lastHeartbeatRef.current = Date.now();
      patchItem(e as MessageEvent);
      refreshJob();
    });
    es.addEventListener("ping", () => {
      lastHeartbeatRef.current = Date.now();
    });
    es.addEventListener("finished", () => {
      refreshJob();
      void queryClient.invalidateQueries({ queryKey: ["job", jobId, "items"] });
      closed = true;
      setStatus("closed");
      es.close();
    });

    return () => {
      closed = true;
      es.close();
    };
  }, [jobId, sseEnabled, apiBaseUrl, token, queryClient]);

  // Terminate live status when the job is terminal.
  useEffect(() => {
    const data = job.data as Job | undefined;
    if (!data) return;
    if (["completed", "partial", "failed", "cancelled"].includes(data.status)) {
      setStatus((prev) => (prev === "closed" ? prev : "closed"));
    }
  }, [job.data]);

  return {
    job: job.data,
    jobQuery: job,
    items: items.data?.items,
    itemsQuery: items,
    isLoading: job.isLoading,
    isError: job.isError,
    liveStatus: status,
  };
}
