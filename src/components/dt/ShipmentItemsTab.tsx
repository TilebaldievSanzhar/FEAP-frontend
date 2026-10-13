import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, Check, Plus, Search, Sparkles, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AICard } from "@/components/dt/AICard";
import { CodeSourceBadge, GBadge } from "@/components/dt/badges";
import { useJobLive } from "@/components/jobs/useJobLive";
import {
  useCatalogSuggest,
  useClassifyShipment,
  useDescribe31,
  useImportCatalogFromShipment,
} from "@/api/dt";
import {
  codeSourceOf,
  emptyItem,
  formatHsCode,
  itemConfidence,
  type G31Out,
  type ShipmentIn,
  type ShipmentItemIn,
} from "@/api/dt-types";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface Props {
  shipmentId: string;
  shipmentStatus: string;
  value: ShipmentIn;
  onChange: (next: ShipmentIn) => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
  dirty: boolean;
  canWrite: boolean;
}

function ItemField({
  label,
  g,
  hint,
  children,
}: {
  label: string;
  g?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--text-muted)]">
        <span>
          {label} {g ? <GBadge g={g} /> : null}
        </span>
        {hint ? <span className="font-normal text-[var(--text-faint)]">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function ShipmentItemsTab({
  shipmentId,
  shipmentStatus,
  value,
  onChange,
  onSave,
  saving,
  dirty,
  canWrite,
}: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [expanded, setExpanded] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [g31, setG31] = useState<{ position: number; result: G31Out } | null>(null);

  const classify = useClassifyShipment(shipmentId);
  const describe31 = useDescribe31(shipmentId);
  const importCatalog = useImportCatalogFromShipment();
  const live = useJobLive(jobId);

  const noCode = value.items.filter((i) => !i.hs_code).length;

  // When the classify job finishes, the backend wrote codes into positions —
  // refetch the dossier (workspace resets the local model when not dirty).
  const jobStatus = live.job?.status;
  useEffect(() => {
    if (!jobId) return;
    if (jobStatus && ["completed", "partial", "failed", "cancelled"].includes(jobStatus)) {
      void qc.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      void qc.invalidateQueries({ queryKey: ["shipments"] });
    }
  }, [jobId, jobStatus, qc, shipmentId]);

  function setItem(idx: number, item: ShipmentItemIn) {
    const items = value.items.slice();
    items[idx] = item;
    onChange({ ...value, items });
  }

  function addItem() {
    onChange({ ...value, items: [...value.items, emptyItem()] });
    setExpanded(value.items.length);
  }

  function removeItem(idx: number) {
    const items = value.items.slice();
    items.splice(idx, 1);
    onChange({ ...value, items });
    setExpanded(null);
  }

  async function onClassify(force: boolean) {
    if (force && !window.confirm(t("items.forceConfirm"))) return;
    if (dirty) {
      const ok = await onSave();
      if (!ok) return;
    }
    try {
      const out = await classify.mutateAsync({ force });
      setJobId(out.job_id);
      toast.success(t("items.classifyStarted", { n: out.enqueued, skipped: out.skipped }));
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message);
    }
  }

  async function onDescribe31(idx: number) {
    if (dirty) {
      toast.warning(t("items.saveBeforeG31"));
      return;
    }
    try {
      const result = await describe31.mutateAsync(idx + 1);
      setG31({ position: idx + 1, result });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  async function onImportCatalog() {
    try {
      const out = await importCatalog.mutateAsync(shipmentId);
      setApproveOpen(false);
      toast.success(
        t("items.importDone", { imported: out.imported, updated: out.updated, skipped: out.skipped }),
      );
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  const approvable = value.items.filter((i) => i.sku && i.hs_code);
  const jobRunning = Boolean(
    jobId && jobStatus && !["completed", "partial", "failed", "cancelled"].includes(jobStatus),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {canWrite ? (
          <>
            <Button
              disabled={noCode === 0 || classify.isPending || jobRunning || shipmentStatus === "classifying"}
              onClick={() => void onClassify(false)}
            >
              <Sparkles /> {t("items.classifyN", { n: noCode })}
            </Button>
            <Button
              variant="outline"
              disabled={approvable.length === 0 || importCatalog.isPending}
              onClick={() => setApproveOpen(true)}
            >
              <Check /> {t("items.approveToCatalog")}
            </Button>
          </>
        ) : null}
        <div className="flex-1" />
        {canWrite ? (
          <>
            <Button size="sm" variant="ghost" onClick={addItem}>
              <Plus /> {t("items.addItem")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[var(--text-subtle)]"
              disabled={classify.isPending || jobRunning}
              onClick={() => void onClassify(true)}
            >
              {t("items.reclassifyAll")}
            </Button>
          </>
        ) : null}
      </div>

      {/* Live classify progress */}
      {jobId && live.job ? (
        <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--info-border)] bg-[var(--info-tint)] px-3.5 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium text-[var(--info)]">
              {t("items.jobProgress", {
                done: live.job.progress.completed,
                total: live.job.progress.total,
              })}
              {live.job.progress.needs_input > 0
                ? ` · ${t("items.jobNeedsInput", { n: live.job.progress.needs_input })}`
                : ""}
            </div>
            <div className="conf-bar mt-1.5" style={{ maxWidth: 260 }}>
              <i
                style={{
                  width: `${live.job.progress.total ? Math.round((live.job.progress.completed / live.job.progress.total) * 100) : 0}%`,
                  background: "var(--info)",
                }}
              />
            </div>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/document/$jobId/results" params={{ jobId }}>
              {t("items.openJob")} <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : shipmentStatus === "classifying" && !jobId ? (
        <div className="alert alert-info">
          <div className="flex-1 text-[12.5px]">{t("items.classifyingBanner")}</div>
        </div>
      ) : null}

      {/* Items table */}
      <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
        <table className="w-full border-separate border-spacing-0 text-[12.5px]">
          <thead>
            <tr>
              {[
                { l: "№", cls: "w-[36px]" },
                { l: `${t("items.colDesc")} (гр. 31)`, cls: "min-w-[240px]" },
                { l: `${t("items.colCode")} (гр. 33)`, cls: "w-[170px]" },
                { l: "гр. 34", cls: "w-[64px]" },
                { l: t("items.colQty"), cls: "w-[90px] text-right" },
                { l: `${t("items.colPrice")} (42)`, cls: "w-[100px] text-right" },
                { l: t("items.colWeights"), cls: "w-[110px] text-right" },
                { l: "SKU", cls: "w-[90px]" },
                { l: "", cls: "w-[40px]" },
              ].map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "whitespace-nowrap border-b border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-subtle)]",
                    h.cls,
                  )}
                >
                  {h.l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-[13px] text-[var(--text-subtle)]">
                  {t("items.empty")}
                </td>
              </tr>
            ) : null}
            {value.items.map((it, idx) => {
              const source = codeSourceOf(it);
              const conf = itemConfidence(it);
              const isOpen = expanded === idx;
              return (
                <tr
                  key={idx}
                  className={cn("cursor-pointer align-top", isOpen ? "bg-[var(--bg-subtle)]" : "hover:bg-[var(--bg-subtle)]")}
                  onClick={() => setExpanded(isOpen ? null : idx)}
                >
                  <td className="border-b border-[var(--border)] px-3 py-2.5 font-mono text-[11px] tabular-nums text-[var(--text-faint)]">
                    {idx + 1}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 leading-snug">
                    {it.description || (
                      <span className="text-[var(--text-faint)]">{t("items.noDesc")}</span>
                    )}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5">
                    {it.hs_code ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-mono text-[12.5px] font-medium">
                          {formatHsCode(it.hs_code)}
                        </span>
                        {source ? <CodeSourceBadge source={source} confidence={conf} /> : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded(idx);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-dashed border-[var(--warn-border)] bg-[var(--warn-tint)] px-2 py-1 text-[11.5px] text-[var(--warn-strong)]"
                      >
                        <Search className="h-2.5 w-2.5" /> {t("items.setCode")}
                      </button>
                    )}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 font-mono text-[11.5px]">
                    {it.origin_country ?? "—"}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[12px] tabular-nums">
                    {it.qty ? `${it.qty}${it.qty_unit ? ` ${it.qty_unit}` : ""}` : "—"}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[12px] tabular-nums">
                    {it.price}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[11.5px] tabular-nums text-[var(--text-subtle)]">
                    {it.net_kg ?? "—"} / {it.gross_kg ?? "—"}
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 font-mono text-[11.5px] text-[var(--text-muted)]">
                    {it.sku || "—"}
                  </td>
                  <td className="border-b border-[var(--border)] px-2 py-2">
                    {canWrite ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[var(--text-faint)] hover:text-[var(--danger)]"
                        aria-label={t("items.removeItem")}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(idx);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded item editor + G31 helper */}
      {expanded !== null && value.items[expanded] ? (
        <ItemEditor
          idx={expanded}
          item={value.items[expanded]}
          onChange={(item) => setItem(expanded, item)}
          canWrite={canWrite}
          g31={g31?.position === expanded + 1 ? g31.result : null}
          g31Pending={describe31.isPending}
          onDescribe31={() => void onDescribe31(expanded)}
          g31Blocked={dirty}
          onInsertG31={(text) => {
            setItem(expanded, { ...value.items[expanded], description: text });
            toast.success(t("items.g31Inserted"));
          }}
        />
      ) : null}

      {/* Save bar */}
      {canWrite ? (
        <div className="flex items-center gap-3 border-t border-[var(--border)] py-3">
          <span className="text-[12px] text-[var(--text-subtle)]">{t("ws.saveHint")}</span>
          <div className="flex-1" />
          <Button disabled={!dirty || saving} onClick={() => void onSave()}>
            <Check /> {t("ws.save")}
          </Button>
        </div>
      ) : null}

      {/* Approve-to-catalog dialog */}
      <Sheet open={approveOpen} onOpenChange={setApproveOpen}>
        <SheetContent side="right" className="flex flex-col bg-[var(--bg)]">
          <SheetHeader>
            <SheetTitle>{t("items.approveTitle")}</SheetTitle>
            <SheetDescription>{t("items.approveHint")}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-1 overflow-auto px-6">
            {approvable.map((it, i) => {
              const source = codeSourceOf(it);
              const conf = itemConfidence(it);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-[var(--r-sm)] bg-[var(--primary-tint)] px-2.5 py-2"
                >
                  <span className="w-[100px] shrink-0 font-mono text-[12px] font-medium">{it.sku}</span>
                  <ArrowRight className="h-3 w-3 text-[var(--text-faint)]" />
                  <span className="font-mono text-[12px] font-medium">{formatHsCode(it.hs_code)}</span>
                  <span className="ml-auto">
                    {source ? <CodeSourceBadge source={source} confidence={conf} /> : null}
                  </span>
                </div>
              );
            })}
            <div className="px-2 py-1.5 text-[11.5px] text-[var(--text-faint)]">
              {t("items.approveSkipped", { n: value.items.length - approvable.length })}
            </div>
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={importCatalog.isPending} onClick={() => void onImportCatalog()}>
              <Check /> {t("items.approveConfirm", { n: approvable.length })}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Expanded row: item form + G31 helper ────────────────────────────────────

function ItemEditor({
  idx,
  item,
  onChange,
  canWrite,
  g31,
  g31Pending,
  g31Blocked,
  onDescribe31,
  onInsertG31,
}: {
  idx: number;
  item: ShipmentItemIn;
  onChange: (item: ShipmentItemIn) => void;
  canWrite: boolean;
  g31: G31Out | null;
  g31Pending: boolean;
  g31Blocked: boolean;
  onDescribe31: () => void;
  onInsertG31: (text: string) => void;
}) {
  const { t } = useTranslation();
  const ro = !canWrite;
  const set = <K extends keyof ShipmentItemIn>(key: K, v: ShipmentItemIn[K]) =>
    onChange({ ...item, [key]: v });

  const [skuQuery, setSkuQuery] = useState("");
  const debouncedSku = useDebounce(skuQuery, 300);
  const suggest = useCatalogSuggest(debouncedSku);

  return (
    <div>
      <div className="eyebrow mb-2.5">
        {t("items.editorTitle", { n: idx + 1 })}
      </div>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {/* Item form */}
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3.5 py-2.5">
            <span className="text-[12.5px] font-semibold">{t("items.formTitle")}</span>
            <span className="chip chip-outline font-mono">ShipmentItemIn</span>
          </div>
          <div className="grid gap-3 p-3.5">
            <ItemField
              label="description"
              g="31"
              hint={
                item.description.length < 30
                  ? t("items.descShort", { n: item.description.length })
                  : `${item.description.length} ${t("items.chars")}`
              }
            >
              <Textarea
                className="min-h-[60px] text-[12.5px]"
                value={item.description}
                disabled={ro}
                onChange={(e) => set("description", e.target.value)}
              />
            </ItemField>
            <div className="grid grid-cols-3 gap-2.5">
              <ItemField label="hs_code" g="33">
                <Input
                  className="font-mono"
                  maxLength={10}
                  placeholder="8509800000"
                  value={item.hs_code ?? ""}
                  disabled={ro}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "") || null;
                    onChange({ ...item, hs_code: v, classification_ref: null });
                  }}
                />
              </ItemField>
              <ItemField label="origin" g="34">
                <Input
                  className="font-mono uppercase"
                  maxLength={2}
                  placeholder="CN"
                  value={item.origin_country ?? ""}
                  disabled={ro}
                  onChange={(e) => set("origin_country", e.target.value.toUpperCase() || null)}
                />
              </ItemField>
              <ItemField label="preference" g="36">
                <Input
                  className="font-mono"
                  maxLength={4}
                  placeholder="—"
                  value={item.preference ?? ""}
                  disabled={ro}
                  onChange={(e) => set("preference", e.target.value || null)}
                />
              </ItemField>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              <ItemField label="qty">
                <Input
                  className="font-mono tabular-nums"
                  inputMode="decimal"
                  value={item.qty ?? ""}
                  disabled={ro}
                  onChange={(e) => set("qty", e.target.value.replace(",", ".") || null)}
                />
              </ItemField>
              <ItemField label={`price · ${t("items.colPrice")}`} g="42">
                <Input
                  className="font-mono tabular-nums"
                  inputMode="decimal"
                  value={item.price}
                  disabled={ro}
                  onChange={(e) => set("price", e.target.value.replace(",", ".") || "0")}
                />
              </ItemField>
              <ItemField label="net_kg" g="38">
                <Input
                  className="font-mono tabular-nums"
                  inputMode="decimal"
                  value={item.net_kg ?? ""}
                  disabled={ro}
                  onChange={(e) => set("net_kg", e.target.value.replace(",", ".") || null)}
                />
              </ItemField>
              <ItemField label="gross_kg" g="35">
                <Input
                  className="font-mono tabular-nums"
                  inputMode="decimal"
                  value={item.gross_kg ?? ""}
                  disabled={ro}
                  onChange={(e) => set("gross_kg", e.target.value.replace(",", ".") || null)}
                />
              </ItemField>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              <ItemField label="qty_unit">
                <Input
                  value={item.qty_unit ?? ""}
                  disabled={ro}
                  onChange={(e) => set("qty_unit", e.target.value || null)}
                />
              </ItemField>
              <ItemField label="packages">
                <Input
                  className="font-mono tabular-nums"
                  inputMode="numeric"
                  value={item.packages ?? ""}
                  disabled={ro}
                  onChange={(e) => set("packages", e.target.value ? Number(e.target.value) : null)}
                />
              </ItemField>
              <ItemField label={`supp_qty`} g="41">
                <Input
                  className="font-mono tabular-nums"
                  inputMode="decimal"
                  value={item.supp_qty ?? ""}
                  disabled={ro}
                  onChange={(e) => set("supp_qty", e.target.value.replace(",", ".") || null)}
                />
              </ItemField>
              <ItemField label="supp_unit">
                <Input
                  value={item.supp_unit ?? ""}
                  disabled={ro}
                  onChange={(e) => set("supp_unit", e.target.value || null)}
                />
              </ItemField>
            </div>
            <ItemField label="sku" hint={t("items.skuHint")}>
              <div className="relative">
                <Input
                  className="font-mono"
                  value={item.sku ?? ""}
                  disabled={ro}
                  onChange={(e) => {
                    set("sku", e.target.value || null);
                    setSkuQuery(e.target.value);
                  }}
                  onBlur={() => window.setTimeout(() => setSkuQuery(""), 200)}
                />
                {skuQuery.length >= 2 && (suggest.data?.items.length ?? 0) > 0 ? (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[hsl(var(--card))] shadow-[var(--shadow-lg)]">
                    {suggest.data!.items.slice(0, 6).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left hover:bg-[var(--bg-muted)]"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onChange({
                            ...item,
                            sku: s.sku,
                            description: item.description || s.description,
                            hs_code: s.hs_code ?? item.hs_code,
                            classification_ref: s.hs_code ? `catalog:${s.id}` : item.classification_ref,
                          });
                          setSkuQuery("");
                        }}
                      >
                        <span className="font-mono text-[12px] font-medium">{s.sku}</span>
                        <span className="min-w-0 flex-1 truncate text-[11.5px] text-[var(--text-subtle)]">
                          {s.description}
                        </span>
                        {s.hs_code ? (
                          <span className="font-mono text-[11px]">{formatHsCode(s.hs_code)}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </ItemField>
          </div>
        </div>

        {/* G31 helper */}
        <div className="flex flex-col gap-3">
          {g31 ? (
            <AICard
              title={t("items.g31Title")}
              verified={g31.accepted ? true : false}
              verifiedNote={g31.accepted ? undefined : t("items.g31Rejected")}
              why={
                g31.accepted
                  ? t("items.g31WhyAccepted")
                  : g31.rejection_reasons.join("; ") || undefined
              }
              evidence={g31.facts.map(
                (f) => `${f.label}: ${f.value} — ${f.source}${g31.facts_used.includes(f.id) ? " ✓" : ""}`,
              )}
              muted={!g31.accepted}
              actions={
                g31.text_ru && canWrite ? (
                  <>
                    <Button size="sm" onClick={() => onInsertG31(g31.text_ru!)}>
                      {t("items.g31Insert")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onDescribe31} disabled={g31Pending}>
                      {t("items.g31Retry")}
                    </Button>
                  </>
                ) : undefined
              }
            >
              {g31.text_ru ?? t("items.g31NoText")}
              {g31.missing_attributes.length > 0 ? (
                <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--warn-strong)]">
                  <TriangleAlert className="h-3 w-3" />
                  {t("items.g31Missing")}: {g31.missing_attributes.join(", ")}
                </div>
              ) : null}
            </AICard>
          ) : (
            <div className="flex flex-col items-start gap-2 rounded-[var(--r-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] p-4">
              <div className="text-[12.5px] text-[var(--text-muted)]">{t("items.g31Intro")}</div>
              {canWrite ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={g31Pending}
                  onClick={onDescribe31}
                  title={g31Blocked ? t("items.saveBeforeG31") : undefined}
                >
                  <Sparkles /> {g31Pending ? t("items.g31Loading") : t("items.g31Ask")}
                </Button>
              ) : null}
              {g31Blocked ? (
                <div className="text-[11px] text-[var(--warn-strong)]">{t("items.saveBeforeG31")}</div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
