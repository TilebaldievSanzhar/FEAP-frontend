import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, Plus, Scale, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DossierStatusBadge } from "@/components/dt/badges";
import { useCloneShipment, useDeleteShipment, useShipments } from "@/api/dt";
import { useHasRole } from "@/stores/auth";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const STATUS_FILTERS = [null, "draft", "classifying", "review", "ready"] as const;

function DeclarationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const canWrite = useHasRole("declarant");

  const [status, setStatus] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const list = useShipments({ status, limit: PAGE_SIZE, offset });
  const clone = useCloneShipment();
  const remove = useDeleteShipment();

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  function openShipment(id: string) {
    void navigate({ to: "/declarations/$shipmentId", params: { shipmentId: id } });
  }

  async function onClone(id: string) {
    try {
      const copy = await clone.mutateAsync(id);
      toast.success(t("decl.cloned"));
      openShipment(copy.id);
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(t("decl.deleteConfirm"))) return;
    try {
      await remove.mutateAsync(id);
      toast.success(t("decl.deleted"));
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  function fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString(i18n.language === "ky" ? "ky-KG" : "ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <AppShell crumbs={[t("shell.sectionWork"), t("shell.navDeclarations")]}>
      <header className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-1.5">/declarations · GET /shipments</div>
          <h1 className="text-2xl font-medium tracking-tight">
            {t("decl.title")}{" "}
            <span className="font-normal text-[var(--text-subtle)]">· {t("decl.subtitle")}</span>
          </h1>
        </div>
        {canWrite ? (
          <Button onClick={() => void navigate({ to: "/declarations/new" })}>
            <Plus /> {t("decl.newShipment")}
          </Button>
        ) : null}
      </header>

      <div className="mb-4 flex gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const active = status === f;
          return (
            <button
              key={f ?? "all"}
              type="button"
              onClick={() => {
                setStatus(f);
                setOffset(0);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px]",
                active
                  ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
                  : "border-[var(--border)] bg-[hsl(var(--card))] text-[var(--text-muted)] hover:border-[var(--border-strong)]",
              )}
            >
              {f === null ? t("decl.filterAll") : <span className="font-mono">{f}</span>}
              {f === null && list.data ? (
                <span className="font-mono text-[10.5px] tabular-nums opacity-65">{total}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {list.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : list.isError ? (
        <div className="alert alert-warn">
          <div className="flex-1 text-[12.5px]">{parseApiError(list.error).message}</div>
          <Button size="sm" variant="outline" onClick={() => void list.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] p-10 text-center">
          <Scale className="mx-auto mb-3 h-8 w-8 text-[var(--primary)]" />
          <h3 className="m-0 text-base font-semibold">{t("decl.emptyTitle")}</h3>
          <p className="mx-auto mt-1 max-w-[420px] text-[13px] text-[var(--text-subtle)]">
            {t("decl.emptyHint")}
          </p>
          {canWrite ? (
            <Button className="mt-4" onClick={() => void navigate({ to: "/declarations/new" })}>
              <Plus /> {t("decl.newShipment")}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
          <table className="w-full border-separate border-spacing-0 text-[12.5px]">
            <thead>
              <tr>
                {[
                  { label: t("decl.colBuyer"), cls: "min-w-[220px]" },
                  { label: t("decl.colStatus"), cls: "w-[130px]" },
                  { label: t("decl.colItems"), cls: "w-[160px]" },
                  { label: t("decl.colUpdated"), cls: "w-[150px]" },
                  { label: "", cls: "w-[190px]" },
                ].map((h, i) => (
                  <th
                    key={i}
                    className={cn(
                      "whitespace-nowrap border-b border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-subtle)]",
                      h.cls,
                    )}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer hover:bg-[var(--bg-subtle)]"
                  onClick={() => openShipment(s.id)}
                >
                  <td className="border-b border-[var(--border)] px-3 py-2.5 align-top">
                    <div className="text-[13px] font-medium">
                      {s.buyer_name || t("decl.noBuyer")}
                    </div>
                    <div className="mt-0.5 font-mono text-[10.5px] text-[var(--text-faint)]">
                      {s.procedure}
                    </div>
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 align-top">
                    <DossierStatusBadge status={s.status} />
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 align-top">
                    <span className="font-mono tabular-nums">{s.items_count}</span>
                    {s.items_without_code > 0 ? (
                      <span className="ml-2 rounded-full bg-[var(--warn-tint)] px-2 py-px font-mono text-[10.5px] text-[var(--warn-strong)]">
                        {t("decl.noCode")}: {s.items_without_code}
                      </span>
                    ) : null}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 align-top text-[12px] text-[var(--text-subtle)]">
                    {fmtDate(s.updated_at)}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2 align-top">
                    <div
                      className="flex justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="ghost" onClick={() => openShipment(s.id)}>
                        {t("decl.open")}
                      </Button>
                      {canWrite ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={clone.isPending}
                            onClick={() => void onClone(s.id)}
                          >
                            <Copy /> {t("decl.clone")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[var(--text-faint)] hover:text-[var(--danger)]"
                            aria-label={t("decl.delete")}
                            onClick={() => void onDelete(s.id)}
                          >
                            <Trash2 />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center px-3.5 py-2.5 text-[12px] text-[var(--text-subtle)]">
            <span>
              {t("decl.shown", { shown: items.length })}{" "}
              <span className="font-mono tabular-nums">{total}</span>
            </span>
            <div className="flex-1" />
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                ‹
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                ›
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export const Route = createFileRoute("/declarations/")({
  component: DeclarationsPage,
});
