import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Info, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { CatalogEditor } from "@/components/catalog/CatalogEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalog, useDeleteCatalogItem, useUpsertCatalogItem } from "@/api/dt";
import { formatHsCode, type CatalogItemOut } from "@/api/dt-types";
import { useHasRole } from "@/stores/auth";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/lib/errors";

const PAGE_SIZE = 50;

function CatalogPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const canWrite = useHasRole("declarant");

  const [query, setQuery] = useState("");
  const q = useDebounce(query, 300);
  const [offset, setOffset] = useState(0);
  const list = useCatalog({ q: q || undefined, limit: PAGE_SIZE, offset });
  const upsert = useUpsertCatalogItem();
  const remove = useDeleteCatalogItem();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItemOut | null>(null);

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(item: CatalogItemOut) {
    setEditing(item);
    setEditorOpen(true);
  }

  async function onDelete(item: CatalogItemOut) {
    if (!window.confirm(t("catalog.deleteConfirm", { sku: item.sku }))) return;
    try {
      await remove.mutateAsync(item.id);
      toast.success(t("catalog.deleted"));
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(i18n.language === "ky" ? "ky-KG" : "ru-RU");
    } catch {
      return iso;
    }
  }

  return (
    <AppShell crumbs={[t("shell.sectionWork"), t("shell.navCatalog")]}>
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-1.5">/catalog · {t("catalog.eyebrow")}</div>
          <h1 className="text-2xl font-medium tracking-tight">
            {t("catalog.title")}{" "}
            {list.data ? (
              <span className="font-normal text-[var(--text-subtle)]">
                · {total} SKU
              </span>
            ) : null}
          </h1>
        </div>
        <div className="flex gap-2">
          <div className="relative w-[260px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-faint)]" />
            <Input
              className="pl-8"
              placeholder={t("catalog.searchPlaceholder")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOffset(0);
              }}
            />
          </div>
          {canWrite ? (
            <Button onClick={openCreate}>
              <Plus /> {t("catalog.newItem")}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="alert alert-info mb-4">
        <Info className="alert-ico h-4 w-4" />
        <div className="text-[12px]">{t("catalog.banner")}</div>
      </div>

      {list.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] p-8 text-center text-[13px] text-[var(--text-subtle)]">
          {q ? t("catalog.emptySearch") : t("catalog.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
          <table className="w-full border-separate border-spacing-0 text-[12.5px]">
            <thead>
              <tr>
                {[
                  { l: "SKU", c: "w-[120px]" },
                  { l: t("catalog.colDesc"), c: "min-w-[240px]" },
                  { l: t("catalog.colCode"), c: "w-[150px]" },
                  { l: t("catalog.colAttrs"), c: "min-w-[140px]" },
                  { l: t("catalog.colUsed"), c: "w-[110px] text-right" },
                  { l: t("catalog.colApproved"), c: "w-[170px]" },
                  { l: "", c: "w-[80px]" },
                ].map((h, i) => (
                  <th
                    key={i}
                    className={`whitespace-nowrap border-b border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-subtle)] ${h.c}`}
                  >
                    {h.l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer align-top hover:bg-[var(--bg-subtle)]"
                  onClick={() => void navigate({ to: "/catalog/$sku", params: { sku: c.sku } })}
                >
                  <td className="border-b border-[var(--border)] px-3 py-2.5 font-mono text-[12px] font-medium">
                    {c.sku}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5">{c.description}</td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5">
                    {c.hs_code ? (
                      <span className="font-mono text-[12.5px] font-medium">
                        {formatHsCode(c.hs_code)}
                      </span>
                    ) : (
                      <span className="text-[11.5px] text-[var(--text-faint)]">
                        {t("catalog.noCode")}
                      </span>
                    )}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(c.attributes).length === 0 ? (
                        <span className="text-[11.5px] text-[var(--text-faint)]">—</span>
                      ) : (
                        Object.entries(c.attributes).map(([k, v]) => (
                          <span key={k} className="chip chip-outline text-[10.5px]" title={k}>
                            {String(v)}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono tabular-nums">
                    <span className={c.usage_count > 0 ? "" : "text-[var(--text-faint)]"}>
                      {c.usage_count}
                    </span>
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 text-[11.5px] text-[var(--text-subtle)]">
                    {c.approved_by ? `${c.approved_by} · ${fmtDate(c.approved_at)}` : "—"}
                  </td>
                  <td className="border-b border-[var(--border)] px-2 py-2">
                    {canWrite ? (
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" aria-label={t("catalog.edit")} onClick={() => openEdit(c)}>
                          <Pencil />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[var(--text-faint)] hover:text-[var(--danger)]"
                          aria-label={t("catalog.delete")}
                          onClick={() => void onDelete(c)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ) : null}
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
              <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                ‹
              </Button>
              <Button size="sm" variant="ghost" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                ›
              </Button>
            </div>
          </div>
        </div>
      )}

      <CatalogEditor
        key={editing?.id ?? "new"}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        item={editing}
        pending={upsert.isPending}
        onSubmit={async (payload) => {
          try {
            await upsert.mutateAsync(payload);
            setEditorOpen(false);
            toast.success(t("catalog.saved"));
          } catch (err) {
            toast.error(parseApiError(err).message);
          }
        }}
      />
    </AppShell>
  );
}

export const Route = createFileRoute("/catalog/")({
  component: CatalogPage,
});
