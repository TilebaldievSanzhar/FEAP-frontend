import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DossierStatusBadge } from "@/components/dt/badges";
import { StatusRail } from "@/components/dt/StatusRail";
import { ShipmentFormTab } from "@/components/dt/ShipmentFormTab";
import { ShipmentItemsTab } from "@/components/dt/ShipmentItemsTab";
import { ShipmentDocsTab } from "@/components/dt/ShipmentDocsTab";
import { ShipmentChecksTab } from "@/components/dt/ShipmentChecksTab";
import { DtDraftTab } from "@/components/dt/DtDraftTab";
import {
  downloadDraftExport,
  useCloneShipment,
  useDraft,
  useGenerateDraft,
  useShipment,
  useShipmentDocuments,
  useUpdateShipment,
  type ExportFormat,
} from "@/api/dt";
import type { ShipmentIn } from "@/api/dt-types";
import { useHasRole } from "@/stores/auth";
import { parseApiError } from "@/lib/errors";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";

export type WorkspaceTab = "shipment" | "items" | "docs" | "checks" | "draft";

const TABS: WorkspaceTab[] = ["shipment", "items", "docs", "checks", "draft"];

interface WorkspaceSearch {
  tab?: WorkspaceTab;
  /** «Товары»: 1-based position to open (jump from the draft). */
  item?: number;
  /** «Товары»: remedy to ring inside that position, e.g. AD-32. */
  remedy?: string;
}

function WorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shipmentId } = Route.useParams();
  const { tab: tabParam, item: focusItem, remedy: focusRemedy } = Route.useSearch();
  const tab: WorkspaceTab = tabParam ?? "shipment";
  const canWrite = useHasRole("declarant");

  const shipment = useShipment(shipmentId);
  const docs = useShipmentDocuments(shipmentId);
  const update = useUpdateShipment(shipmentId);
  const clone = useCloneShipment();
  const generate = useGenerateDraft(shipmentId);

  // Latest generated draft wins over the persisted latest_draft_id.
  const [generatedDraftId, setGeneratedDraftId] = useState<string | null>(null);
  const draftId = generatedDraftId ?? shipment.data?.latest_draft_id ?? null;
  const draft = useDraft(draftId);

  // Local editable copy — PUT replaces the whole dossier, so the form works
  // on one ShipmentIn object across tabs and saves explicitly.
  const [model, setModel] = useState<ShipmentIn | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (shipment.data && !dirty) setModel(shipment.data.data);
  }, [shipment.data, dirty]);

  const onChange = useCallback((next: ShipmentIn) => {
    setModel(next);
    setDirty(true);
  }, []);

  const save = useCallback(
    async (next?: ShipmentIn): Promise<boolean> => {
      const payload = next ?? model;
      if (!payload) return false;
      try {
        await update.mutateAsync(payload);
        setDirty(false);
        toast.success(t("ws.saved"));
        return true;
      } catch (err) {
        toast.error(parseApiError(err).message);
        return false;
      }
    },
    [model, update, t],
  );

  function setTab(next: WorkspaceTab, focus?: { item?: number; remedy?: string }) {
    void navigate({
      to: "/declarations/$shipmentId",
      params: { shipmentId },
      search: { tab: next, ...focus },
      replace: true,
    });
  }

  async function onGenerate() {
    if (dirty) {
      const ok = await save();
      if (!ok) return;
    }
    try {
      const created = await generate.mutateAsync();
      setGeneratedDraftId(created.id);
      toast.success(t("ws.draftGenerated", { version: created.version }));
      setTab("draft");
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  async function onExport(format: ExportFormat) {
    if (!draftId) return;
    setExporting(format);
    try {
      await downloadDraftExport(draftId, format);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const payload = err.payload as { detail?: { errors?: string[] } } | null;
        const list = payload?.detail?.errors ?? [];
        toast.error(t("ws.xsdFailed"), {
          description: list.slice(0, 5).join("\n") || undefined,
        });
      } else {
        toast.error(parseApiError(err).message);
      }
    } finally {
      setExporting(null);
    }
  }

  async function onClone() {
    try {
      const copy = await clone.mutateAsync(shipmentId);
      toast.success(t("decl.cloned"));
      void navigate({
        to: "/declarations/$shipmentId",
        params: { shipmentId: copy.id },
        search: { tab: "shipment" },
      });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  if (shipment.isLoading) {
    return (
      <AppShell crumbs={[t("shell.navDeclarations")]}>
        <Skeleton className="mb-4 h-9 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (shipment.isError || !shipment.data) {
    return (
      <AppShell crumbs={[t("shell.navDeclarations")]}>
        <div className="alert alert-warn">
          <div className="flex-1 text-[12.5px]">
            {shipment.error ? parseApiError(shipment.error).message : t("ws.notFound")}
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/declarations">{t("ws.backToList")}</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const data = shipment.data;
  const effectiveModel = model ?? data.data;
  // The dossier changed after the draft was assembled (unsaved edits, or a save
  // later than the draft) — amounts and checks may be out of date.
  const draftStale = Boolean(
    draft.data && (dirty || Date.parse(data.updated_at) > Date.parse(draft.data.created_at)),
  );
  const itemsWithoutCode = effectiveModel.items.filter((i) => !i.hs_code).length;
  const docItems = docs.data?.items ?? [];

  const tabMeta: Record<WorkspaceTab, { label: string; n?: string | number }> = {
    shipment: { label: t("ws.tabShipment") },
    items: { label: t("ws.tabItems"), n: effectiveModel.items.length },
    docs: { label: t("ws.tabDocs"), n: docItems.length || undefined },
    checks: { label: t("ws.tabChecks") },
    draft: {
      label: t("ws.tabDraft"),
      n: draft.data ? `v${draft.data.version}` : data.latest_draft_version ? `v${data.latest_draft_version}` : undefined,
    },
  };

  return (
    <AppShell>
      <div className="-mx-8 -mt-7 flex h-[calc(100%+28px+80px)] min-h-0 flex-col">
        {/* Dossier header */}
        <div className="border-b border-[var(--border)] bg-[hsl(var(--card))] px-7 pt-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[12px] text-[var(--text-subtle)]">
              <Link to="/declarations" className="no-underline hover:underline">
                {t("shell.navDeclarations")}
              </Link>{" "}
              <span className="text-[var(--text-faint)]">/</span>
            </span>
            <span className="truncate text-[16px] font-semibold tracking-tight">
              {t("ws.dossier")} · {effectiveModel.buyer.name || t("decl.noBuyer")}
            </span>
            <span className="inline-flex h-[22px] items-center rounded-[var(--r-sm)] bg-[var(--bg-muted)] px-2 font-mono text-[11px] text-[var(--text-muted)]">
              ИМ 40
            </span>
            <DossierStatusBadge status={data.status} />
            {dirty ? (
              <span className="rounded-full bg-[var(--warn-tint)] px-2 py-px text-[10.5px] text-[var(--warn-strong)]">
                {t("ws.unsaved")}
              </span>
            ) : null}
            <div className="flex-1" />
            {canWrite ? (
              <Button size="sm" variant="ghost" onClick={() => void onClone()} disabled={clone.isPending}>
                <Copy /> {t("decl.clone")}
              </Button>
            ) : null}
          </div>
          <div className="flex gap-0.5">
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-[13px]",
                  tab === id
                    ? "border-[var(--text)] font-semibold text-[var(--text)]"
                    : "border-transparent text-[var(--text-subtle)] hover:text-[var(--text)]",
                )}
              >
                {tabMeta[id].label}
                {tabMeta[id].n != null ? (
                  <span className="rounded-[var(--r-sm)] bg-[var(--bg-muted)] px-1.5 py-px font-mono text-[10.5px] text-[var(--text-subtle)]">
                    {tabMeta[id].n}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Body: tab content + status rail */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="feap-scroll min-w-0 flex-1 overflow-auto px-7 py-6">
            {tab === "shipment" && model ? (
              <ShipmentFormTab
                value={model}
                onChange={onChange}
                onSave={() => void save()}
                onDiscard={() => {
                  setModel(data.data);
                  setDirty(false);
                }}
                saving={update.isPending}
                dirty={dirty}
                canWrite={canWrite}
              />
            ) : null}
            {tab === "items" && model ? (
              <ShipmentItemsTab
                shipmentId={shipmentId}
                shipmentStatus={data.status}
                value={model}
                onChange={onChange}
                onSave={save}
                saving={update.isPending}
                dirty={dirty}
                canWrite={canWrite}
                focus={focusItem ? { position: focusItem, remedy: focusRemedy ?? null } : null}
                onGoToDocs={() => setTab("docs")}
              />
            ) : null}
            {tab === "docs" ? <ShipmentDocsTab shipmentId={shipmentId} canWrite={canWrite} /> : null}
            {tab === "checks" ? (
              <ShipmentChecksTab shipmentId={shipmentId} canWrite={canWrite} />
            ) : null}
            {tab === "draft" ? (
              <DtDraftTab
                draft={draft.data ?? null}
                draftLoading={draft.isLoading && Boolean(draftId)}
                hasDraft={Boolean(draftId)}
                stale={draftStale}
                canWrite={canWrite}
                generating={generate.isPending}
                onGenerate={() => void onGenerate()}
                onExport={(f) => void onExport(f)}
                exporting={exporting}
                model={effectiveModel}
                onApplyPatch={(next) => {
                  onChange(next);
                  void save(next);
                }}
                onGoToItem={(position, remedy) => setTab("items", { item: position, remedy })}
                onGoToDocs={() => setTab("docs")}
              />
            ) : null}
          </div>

          {tab !== "draft" ? (
            <StatusRail
              status={data.status}
              itemsCount={effectiveModel.items.length}
              itemsWithoutCode={itemsWithoutCode}
              docsCount={docItems.length}
              docsExtracted={docItems.filter((d) => d.status === "extracted").length}
              draft={draft.data}
              latestVersion={data.latest_draft_version}
              canWrite={canWrite}
              generating={generate.isPending}
              onGenerate={() => void onGenerate()}
              onExport={(f) => void onExport(f)}
              exportDisabled={!draftId || exporting !== null}
            />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/declarations/$shipmentId")({
  validateSearch: (search: Record<string, unknown>): WorkspaceSearch => {
    const item = Number(search.item);
    return {
      tab: TABS.includes(search.tab as WorkspaceTab) ? (search.tab as WorkspaceTab) : undefined,
      item: Number.isInteger(item) && item > 0 ? item : undefined,
      remedy: typeof search.remedy === "string" && search.remedy ? search.remedy : undefined,
    };
  },
  component: WorkspacePage,
});
