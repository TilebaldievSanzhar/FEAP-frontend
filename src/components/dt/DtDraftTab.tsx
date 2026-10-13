import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Download, Info, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AICard } from "@/components/dt/AICard";
import { FindingRow } from "@/components/dt/FindingRow";
import { DraftStatusBadge } from "@/components/dt/badges";
import { GraphCell, TotalCell } from "@/components/dt/GraphCells";
import { useFixSuggestions, type ExportFormat } from "@/api/dt";
import {
  formatHsCode,
  type DtDraftOut,
  type FixOut,
  type Finding,
  type GraphParty,
  type PaymentKind,
  type ShipmentIn,
} from "@/api/dt-types";
import { applyFieldPatch } from "@/lib/shipment-patch";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface Props {
  draft: DtDraftOut | null;
  draftLoading: boolean;
  hasDraft: boolean;
  canWrite: boolean;
  generating: boolean;
  onGenerate: () => void;
  onExport: (format: ExportFormat) => void;
  exporting: ExportFormat | null;
  model: ShipmentIn;
  onApplyPatch: (next: ShipmentIn) => void;
}

function fmtNum(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function partyLabel(p: GraphParty | null): string {
  if (!p) return "—";
  return [p.name, p.country, p.inn ? `ИНН ${p.inn}` : null].filter(Boolean).join(", ");
}

const SEV_ORDER: Record<string, number> = { error: 0, warning: 1, info: 2 };

export function DtDraftTab({
  draft,
  draftLoading,
  hasDraft,
  canWrite,
  generating,
  onGenerate,
  onExport,
  exporting,
  model,
  onApplyPatch,
}: Props) {
  const { t } = useTranslation();
  const [itemIdx, setItemIdx] = useState(0);
  const fix = useFixSuggestions(draft?.id ?? null);
  const [fixResult, setFixResult] = useState<FixOut | null>(null);

  const findings = useMemo(
    () =>
      (draft?.findings ?? [])
        .slice()
        .sort((a, b) => (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3)),
    [draft],
  );

  const errorGraphs = useMemo(() => {
    const set = new Set<string>();
    for (const f of draft?.findings ?? []) {
      if (f.severity === "error" && f.graph) set.add(f.graph);
    }
    return set;
  }, [draft]);

  if (!hasDraft && !draft) {
    return (
      <div className="mx-auto mt-10 max-w-[480px] rounded-[var(--r-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] p-10 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-[var(--primary)]" />
        <h3 className="m-0 text-base font-semibold">{t("draft.emptyTitle")}</h3>
        <p className="mt-1 text-[13px] text-[var(--text-subtle)]">{t("draft.emptyHint")}</p>
        {canWrite ? (
          <Button className="mt-4" disabled={generating} onClick={onGenerate}>
            <Sparkles /> {generating ? t("ws.generating") : t("ws.generateDraft")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (draftLoading || !draft) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const g = draft.graphs;
  const items = g.items ?? [];
  const item = items[Math.min(itemIdx, Math.max(0, items.length - 1))];
  const payments = g.totals.payments ?? {};

  const paymentsTotal = (["duty", "excise", "vat", "fee"] as PaymentKind[])
    .map((k) => Number(payments[k] ?? 0))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => a + b, 0);

  const kindLabel: Record<PaymentKind, string> = {
    duty: t("draft.duty"),
    excise: t("draft.excise"),
    vat: t("draft.vat"),
    fee: t("draft.fee"),
  };

  function onGraphClick(graph: string) {
    const m = /^items\[(\d+)\]/.exec(graph);
    if (m) setItemIdx(Number(m[1]));
  }

  async function onAskFixes() {
    try {
      const out = await fix.mutateAsync();
      setFixResult(out);
      if (out.suggestions.length === 0) toast.info(t("draft.noSuggestions"));
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  function applySuggestion(fieldPath: string, value: string | null) {
    try {
      const next = applyFieldPatch(model, fieldPath, value);
      onApplyPatch(next);
      toast.success(t("draft.patchApplied"), { description: t("draft.patchAppliedHint") });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const itemErr = (suffix: string) => errorGraphs.has(`items[${itemIdx}].${suffix}`);

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* ─── Left: graphs ─── */}
      <div className="flex min-w-0 flex-col gap-4">
        {/* Version bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex h-8 items-center rounded-[var(--r-md)] border border-[var(--border)] bg-[hsl(var(--card))] px-2.5 font-mono text-[12px]">
            v{draft.version}
          </span>
          <DraftStatusBadge status={draft.status} />
          <span className="font-mono text-[11px] text-[var(--text-faint)]">
            structure {draft.structure_version}
          </span>
          <div className="flex-1" />
          {canWrite ? (
            <Button size="sm" disabled={generating} onClick={onGenerate}>
              <RefreshCw /> {generating ? t("ws.generating") : t("draft.rebuild")}
            </Button>
          ) : null}
          {(["xlsx", "pdf"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant="outline"
              className="font-mono uppercase"
              disabled={exporting !== null}
              onClick={() => onExport(f)}
            >
              <Download /> {f}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="font-mono"
            disabled={exporting !== null}
            onClick={() => onExport("xml")}
          >
            <Download /> XML{" "}
            <span className="text-[9.5px] lowercase text-[var(--text-faint)]">
              {t("draft.xmlPreliminary")}
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-2.5 rounded-[var(--r-md)] bg-[var(--bg-muted)] px-3.5 py-2.5 text-[12px] text-[var(--text-subtle)]">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {t("ws.notFilingDisclaimer")}
        </div>

        {/* Header graphs */}
        <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[13px] font-semibold">{t("draft.headerTitle")}</span>
            <span className="chip chip-outline font-mono">header</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4">
            <GraphCell g="1" label={t("draft.g01")} value={`${g.header.g01.direction} ${g.header.g01.procedure} ${g.header.g01.form}`} mono />
            <GraphCell g="2" label={t("draft.g02")} value={partyLabel(g.header.g02)} err={errorGraphs.has("g02")} />
            <GraphCell g="5" label={t("draft.g05")} value={g.header.g05} mono err={errorGraphs.has("g05")} />
            <GraphCell g="6" label={t("draft.g06")} value={g.header.g06 ?? "—"} mono mute={g.header.g06 == null} />
            <GraphCell g="8" label={t("draft.g08")} value={partyLabel(g.header.g08)} err={errorGraphs.has("g08")} />
            <GraphCell g="11" label={t("draft.g11")} value={g.header.g11 ?? "—"} mono mute={!g.header.g11} />
            <GraphCell g="12" label={t("draft.g12")} value={`${fmtNum(g.header.g12)} сом`} mono hl err={errorGraphs.has("g12")} />
            <GraphCell g="14" label={t("draft.g14")} value={partyLabel(g.header.g14)} />
            <GraphCell g="15" label={t("draft.g15")} value={g.header.g15 ?? "—"} mono mute={!g.header.g15} />
            <GraphCell g="17" label={t("draft.g17")} value={g.header.g17 ?? "—"} mono />
            <GraphCell g="20" label={t("draft.g20")} value={[g.header.g20.incoterms, g.header.g20.place].filter(Boolean).join(" ")} mono err={errorGraphs.has("g20")} />
            <GraphCell g="22" label={t("draft.g22")} value={`${g.header.g22.currency} ${fmtNum(g.header.g22.amount)}`} mono err={errorGraphs.has("g22")} />
            <GraphCell g="23" label={t("draft.g23")} value={`${g.header.g23.rate ?? "—"} · ${g.header.g23.date}`} mono err={errorGraphs.has("g23")} />
            <GraphCell g="24" label={t("draft.g24")} value={g.header.g24 ?? "—"} mono mute={!g.header.g24} err={errorGraphs.has("g24")} />
            <GraphCell g="25" label={t("draft.g25")} value={g.header.g25 ?? "—"} mono mute={!g.header.g25} err={errorGraphs.has("g25")} />
            <GraphCell g="37" label={t("draft.g37")} value={`${g.header.g37.requested} ${g.header.g37.previous} ${g.header.g37.feature}`} mono />
          </div>
        </div>

        {/* Item card */}
        {item ? (
          <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px] font-semibold">
                {t("draft.itemTitle", { n: item.g32, total: items.length })}
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={itemIdx === 0} onClick={() => setItemIdx(itemIdx - 1)} aria-label="prev">
                  <ChevronLeft />
                </Button>
                <Button size="sm" variant="ghost" disabled={itemIdx >= items.length - 1} onClick={() => setItemIdx(itemIdx + 1)} aria-label="next">
                  <ChevronRight />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4">
              <GraphCell g="32" label={t("draft.g32")} value={item.g32} mono />
              <GraphCell g="33" label={t("draft.g33")} value={formatHsCode(item.g33) || "—"} mono err={itemErr("g33")} />
              <GraphCell g="34" label={t("draft.g34")} value={item.g34 ?? "—"} mono err={itemErr("g34")} />
              <GraphCell g="35 / 38" label={t("draft.g3538")} value={`${item.g35 ?? "—"} / ${item.g38 ?? "—"}`} mono err={itemErr("g35") || itemErr("g38")} />
              <div className={cn("col-span-2 border-t border-[var(--border)] px-4 py-3 md:col-span-4", itemErr("g31") && "bg-[var(--danger-tint)]")}>
                <div className="mb-1 flex items-baseline gap-1.5">
                  <span className="g-badge">гр. 31</span>
                  <span className="eyebrow !text-[10px]">{t("draft.g31")}</span>
                </div>
                <div className="text-[12.5px] leading-relaxed">
                  {item.g31.description}
                  <span className="text-[var(--text-subtle)]">
                    {item.g31.qty ? ` · ${item.g31.qty}${item.g31.qty_unit ? ` ${item.g31.qty_unit}` : ""}` : ""}
                    {item.g31.packages ? ` · ${item.g31.packages} ${t("draft.packages")}` : ""}
                    {item.g31.sku ? ` · SKU ${item.g31.sku}` : ""}
                  </span>
                </div>
              </div>
              <div className={cn("col-span-2 border-t border-[var(--border)] px-4 py-3 md:col-span-4", itemErr("g44") && "bg-[var(--warn-tint)]")}>
                <div className="mb-1.5 flex items-baseline gap-1.5">
                  <span className="g-badge">гр. 44</span>
                  <span className="eyebrow !text-[10px]">{t("draft.g44")}</span>
                </div>
                {item.g44.length === 0 ? (
                  <div className="text-[12px] text-[var(--text-faint)]">{t("draft.noDocs")}</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {item.g44.map((d, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2.5 text-[11.5px]">
                        <span className="w-11 font-mono text-[var(--text-subtle)]">{d.code ?? "—"}</span>
                        <span className="w-20 text-[var(--text-muted)]">{d.kind}</span>
                        <span className="font-mono">
                          {d.number ?? "—"}
                          {d.date ? ` · ${d.date}` : ""}
                        </span>
                        {d.permit_status === "found" ? (
                          <span className="inline-flex h-[18px] items-center gap-1 rounded-[var(--r-sm)] bg-[var(--success-tint)] px-1.5 text-[10px] text-[var(--success)]">
                            <Check className="h-2.5 w-2.5" /> TULPAR
                          </span>
                        ) : d.permit_status ? (
                          <span className="inline-flex h-[18px] items-center rounded-[var(--r-sm)] bg-[var(--warn-tint)] px-1.5 font-mono text-[10px] text-[var(--warn-strong)]">
                            TULPAR: {d.permit_status}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <GraphCell g="42" label={t("draft.g42")} value={`${g.header.g22.currency} ${fmtNum(item.g42)}`} mono err={itemErr("g42")} />
              <GraphCell g="45" label={t("draft.g45")} value={`${fmtNum(item.g45)} сом`} mono hl err={itemErr("g45")} />
              <GraphCell g="46" label={t("draft.g46")} value={item.g46 ? `USD ${fmtNum(item.g46)}` : "—"} mono mute={!item.g46} />
              <GraphCell
                g="41"
                label={t("draft.g41")}
                value={
                  item.g41.qty
                    ? `${item.g41.qty}${item.g41.unit ? ` ${item.g41.unit}` : ""}`
                    : item.g41.required_unit
                      ? `${t("draft.g41Required")}: ${item.g41.required_unit}`
                      : "—"
                }
                mono
                mute={!item.g41.qty && !item.g41.required_unit}
                err={itemErr("g41")}
              />
            </div>

            {/* G47 */}
            <div className="border-t border-[var(--border)]">
              <div className="flex items-center gap-1.5 px-4 pb-1.5 pt-2.5">
                <span className="g-badge">гр. 47</span>
                <span className="eyebrow !text-[10px]">{t("draft.g47")}</span>
              </div>
              <table className="w-full border-separate border-spacing-0 text-[12px]">
                <thead>
                  <tr>
                    {[t("draft.payKind"), t("draft.payCode"), t("draft.payBasis"), t("draft.payRate"), t("draft.paySum")].map(
                      (h, i) => (
                        <th
                          key={i}
                          className={cn(
                            "border-b border-t border-[var(--border)] bg-[var(--bg-muted)] px-4 py-1.5 text-left text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-subtle)]",
                            i >= 2 && "text-right",
                          )}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(item.g47.length ? item.g47 : []).map((line, i) => {
                    const pending = line.amount == null;
                    return (
                      <tr key={i} className={pending && line.missing.length ? "bg-[var(--warn-tint)]" : undefined}>
                        <td className="border-b border-[var(--border)] px-4 py-2">{kindLabel[line.kind]}</td>
                        <td className="border-b border-[var(--border)] px-4 py-2 font-mono">{line.code}</td>
                        <td className="border-b border-[var(--border)] px-4 py-2 text-right font-mono tabular-nums">
                          {line.basis != null ? fmtNum(line.basis) : "—"}
                        </td>
                        <td className="border-b border-[var(--border)] px-4 py-2 text-right font-mono tabular-nums">
                          {line.rate}
                        </td>
                        <td className="border-b border-[var(--border)] px-4 py-2 text-right">
                          {line.amount != null ? (
                            <span className="font-mono font-semibold tabular-nums">{fmtNum(line.amount)}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--warn-strong)]">
                              <TriangleAlert className="h-3 w-3" />
                              {t("draft.notComputed")}
                              {line.missing.length ? ` · ${line.missing.join("; ")}` : ""}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Totals */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="rounded-[var(--r-lg)] bg-[var(--text)] px-4 py-4 text-[var(--bg)]">
            <div className="mb-2 font-mono text-[10.5px] uppercase tracking-widest opacity-50">
              {t("draft.totalDue")}
            </div>
            <div className="font-mono text-[28px] font-semibold tabular-nums tracking-tight">
              {paymentsTotal.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-[14px] font-normal opacity-60">сом</span>
            </div>
            <div className="mt-1.5 text-[11px] opacity-50">
              {(["duty", "vat", "excise"] as PaymentKind[])
                .filter((k) => payments[k] != null)
                .map((k) => `${kindLabel[k].toLowerCase()} ${fmtNum(payments[k] ?? null)}`)
                .join(" · ")}
              {payments.fee == null && !g.totals.fee_line
                ? ` · ${t("draft.feeNotComputed")}`
                : ""}
            </div>
          </div>
          <TotalCell label={`гр. 12 · ${t("draft.g12")}`} value={fmtNum(g.totals.g12)} unit="сом" />
          <TotalCell label={t("draft.invoiceTotal")} value={fmtNum(g.totals.invoice_total)} unit={g.header.g22.currency} />
          <TotalCell
            label={t("draft.additionsTotal")}
            value={fmtNum(g.totals.additions_total)}
            unit={g.header.g22.currency}
            warn={Number(g.totals.additions_total ?? 0) === 0}
          />
        </div>
      </div>

      {/* ─── Right: findings + fixer ─── */}
      <aside className="flex flex-col gap-3.5 xl:sticky xl:top-0">
        <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3.5 py-2.5">
            <span className="text-[13px] font-semibold">{t("draft.findingsTitle")}</span>
            <div className="flex gap-2.5 font-mono text-[11.5px] tabular-nums">
              <span className="text-[var(--danger)]">
                {findings.filter((f) => f.severity === "error").length}
              </span>
              <span className="text-[var(--warn-strong)]">
                {findings.filter((f) => f.severity === "warning").length}
              </span>
              <span className="text-[var(--info)]">
                {findings.filter((f) => f.severity === "info").length}
              </span>
            </div>
          </div>

          {draft.missing_parameters.length > 0 ? (
            <div className="border-b border-[var(--border)] bg-[var(--warn-tint)] px-3.5 py-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--warn-strong)]">
                <TriangleAlert className="h-3 w-3" /> {t("draft.needsInputTitle")}
              </div>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
                {draft.missing_parameters.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {findings.length === 0 && draft.missing_parameters.length === 0 ? (
            <div className="flex items-center gap-2 px-3.5 py-3 text-[12px] text-[var(--success)]">
              <Check className="h-3.5 w-3.5" /> {t("draft.findingsClean")}
            </div>
          ) : (
            findings.map((f: Finding, i) => (
              <FindingRow
                key={i}
                rule={f.rule}
                severity={f.severity}
                message={f.message}
                graph={f.graph}
                expected={f.details.expected ?? null}
                actual={f.details.actual ?? null}
                onGraphClick={onGraphClick}
                last={i === findings.length - 1}
              />
            ))
          )}
        </div>

        {canWrite && findings.some((f) => f.severity !== "info") ? (
          <Button variant="outline" className="justify-center" disabled={fix.isPending} onClick={() => void onAskFixes()}>
            <Sparkles /> {fix.isPending ? t("draft.fixLoading") : t("draft.suggestFixes")}
          </Button>
        ) : null}

        {fixResult?.analysis ? (
          <div className="rounded-[var(--r-md)] bg-[var(--bg-muted)] px-3 py-2.5 text-[11.5px] leading-relaxed text-[var(--text-subtle)]">
            {fixResult.analysis}
          </div>
        ) : null}

        {fixResult?.suggestions.map((s, i) => {
          const verified = s.action === "propose_value" ? s.verification.verified === true : undefined;
          return (
            <AICard
              key={i}
              title={`fixer · ${s.finding_rule}${s.finding_graph ? ` · ${s.finding_graph}` : ""}`}
              verified={s.action === "propose_value" ? Boolean(verified) : undefined}
              verifiedNote={s.verification.note ?? undefined}
              why={s.why}
              evidence={[
                ...s.evidence,
                ...(s.verification.errors_before != null
                  ? [
                      `${t("draft.rebuildCheck")}: errors ${s.verification.errors_before} → ${s.verification.errors_after}`,
                    ]
                  : []),
              ]}
              muted={s.action === "cannot_fix" || (s.action === "propose_value" && !verified)}
              actions={
                s.action === "propose_value" && s.field_path ? (
                  <>
                    <Button size="sm" onClick={() => applySuggestion(s.field_path!, s.proposed_value)}>
                      {t("draft.apply")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setFixResult((prev) => prev && { ...prev, suggestions: prev.suggestions.filter((x) => x !== s) })}>
                      {t("draft.dismiss")}
                    </Button>
                  </>
                ) : undefined
              }
            >
              {s.action === "propose_value" ? (
                <>
                  {t("draft.setField")} <span className="font-mono">{s.field_path}</span> ={" "}
                  <span className="font-mono font-semibold">{s.proposed_value ?? "∅"}</span>
                </>
              ) : s.action === "ask_user" ? (
                <>
                  <span className="font-semibold">{t("draft.question")}:</span> {s.question}
                </>
              ) : (
                <>
                  <span className="font-semibold">{t("draft.cannotFix")}.</span> {s.question ?? ""}
                </>
              )}
            </AICard>
          );
        })}
      </aside>
    </div>
  );
}
