import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Plus, RefreshCw, ShieldAlert, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DocStatusBadge, PermitStatusBadge } from "@/components/dt/badges";
import {
  useAttachDocument,
  useDeleteDocument,
  useExtractDocument,
  useShipmentDocuments,
  useVerifyPermit,
} from "@/api/dt";
import {
  EXTRACTABLE_KINDS,
  type DocumentKind,
  type DocumentOut,
  type PermitCheckOut,
} from "@/api/dt-types";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";

const ALL_KINDS: DocumentKind[] = [
  "auto",
  "invoice",
  "packing",
  "cmr",
  "awb",
  "rail",
  "contract",
  "cert_origin",
  "permit",
  "other",
];

const PERMIT_KINDS = new Set(["permit", "cert_origin"]);

interface Props {
  shipmentId: string;
  canWrite: boolean;
}

/** Flatten extracted doc fields into displayable rows (skip SGR meta). */
function docFieldRows(doc: Record<string, unknown>): Array<[string, string]> {
  const skip = new Set(["document_profile", "totals_selfcheck", "quality_notes"]);
  const rows: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(doc)) {
    if (v == null || skip.has(k)) continue;
    if (Array.isArray(v)) {
      if (k === "lines") rows.push([k, `${v.length}`]);
      else if (v.length > 0) rows.push([k, v.map(String).join(", ")]);
      continue;
    }
    if (typeof v === "object") {
      const p = v as { name?: string; country?: string };
      const label = [p.name, p.country].filter(Boolean).join(" · ");
      if (label) rows.push([k, label]);
      continue;
    }
    rows.push([k, String(v)]);
  }
  return rows;
}

export function ShipmentDocsTab({ shipmentId, canWrite }: Props) {
  const { t } = useTranslation();
  const docs = useShipmentDocuments(shipmentId);
  const attach = useAttachDocument(shipmentId);
  const remove = useDeleteDocument(shipmentId);
  const extract = useExtractDocument(shipmentId);
  const verify = useVerifyPermit(shipmentId);

  const [attachOpen, setAttachOpen] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [permitResults, setPermitResults] = useState<Record<string, PermitCheckOut>>({});
  const [kindOverride, setKindOverride] = useState<Record<string, string>>({});

  async function onExtract(doc: DocumentOut, kind?: string) {
    setExtractingId(doc.id);
    try {
      const out = await extract.mutateAsync({ docId: doc.id, kind });
      if (out.status === "needs_kind") {
        toast.warning(t("docs.needsKindToast"));
      } else {
        toast.success(t("docs.extracted"));
      }
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setExtractingId(null);
    }
  }

  async function onVerify(doc: DocumentOut, force: boolean) {
    try {
      const out = await verify.mutateAsync({ docId: doc.id, force });
      setPermitResults((prev) => ({ ...prev, [doc.id]: out }));
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  async function onDelete(doc: DocumentOut) {
    if (!window.confirm(t("docs.deleteConfirm"))) return;
    try {
      await remove.mutateAsync(doc.id);
      toast.success(t("docs.deleted"));
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  const items = docs.data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {canWrite ? (
          <Button onClick={() => setAttachOpen(true)}>
            <Plus /> {t("docs.attach")}
          </Button>
        ) : null}
        <span className="text-[12px] text-[var(--text-subtle)]">{t("docs.attachHint")}</span>
      </div>

      {docs.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] p-8 text-center text-[13px] text-[var(--text-subtle)]">
          {t("docs.empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {items.map((doc) => {
            const permit = permitResults[doc.id];
            const busy = extractingId === doc.id;
            const canExtract =
              doc.status !== "needs_kind" &&
              (doc.kind === "auto" || (EXTRACTABLE_KINDS as readonly string[]).includes(doc.kind));
            return (
              <div
                key={doc.id}
                className={cn(
                  "rounded-[var(--r-lg)] border bg-[hsl(var(--card))]",
                  doc.sensor_warnings.length > 0
                    ? "border-[var(--warn-border)]"
                    : "border-[var(--border)]",
                )}
              >
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-3.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex h-[22px] shrink-0 items-center rounded-[var(--r-sm)] bg-[var(--bg-muted)] px-2 font-mono text-[11px]">
                      {doc.kind === "auto" ? "?" : doc.kind}
                    </span>
                    <span className="truncate text-[13px] font-semibold">
                      {doc.number ? `№ ${doc.number}` : t("docs.noNumber")}
                      {doc.doc_date ? ` · ${doc.doc_date}` : ""}
                    </span>
                    <DocStatusBadge status={doc.status} />
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {canWrite && doc.status !== "needs_kind" && canExtract ? (
                      <Button size="sm" variant={doc.status === "extracted" ? "ghost" : "outline"} disabled={busy} onClick={() => void onExtract(doc)}>
                        {doc.status === "extracted" ? <RefreshCw /> : <Sparkles />}
                        {busy
                          ? t("docs.extracting")
                          : doc.status === "extracted"
                            ? t("docs.reExtract")
                            : t("docs.extract")}
                      </Button>
                    ) : null}
                    {canWrite && PERMIT_KINDS.has(doc.kind) ? (
                      <Button size="sm" variant="outline" disabled={verify.isPending} onClick={() => void onVerify(doc, false)}>
                        <Check /> {t("docs.verifyTulpar")}
                      </Button>
                    ) : null}
                    {canWrite ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[var(--text-faint)] hover:text-[var(--danger)]"
                        aria-label={t("docs.delete")}
                        onClick={() => void onDelete(doc)}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 px-3.5 py-3">
                  <div className="font-mono text-[11.5px] text-[var(--text-subtle)]">
                    {doc.source_origin === "ocr"
                      ? t("docs.sourceOcr", {
                          job: (doc.ocr_job_id ?? "").slice(0, 8),
                          chars: doc.text_chars.toLocaleString("ru-RU"),
                        })
                      : t("docs.sourceText", { chars: doc.text_chars.toLocaleString("ru-RU") })}
                  </div>

                  {/* Sensor warnings */}
                  {doc.sensor_warnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex gap-2.5 rounded-[var(--r-md)] border border-[var(--danger-border)] bg-[var(--danger-tint)] px-3 py-2.5"
                    >
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--danger)]" />
                      <div className="text-[12px] leading-relaxed">
                        <span className="font-semibold text-[var(--danger)]">{t("docs.sensor")}:</span>{" "}
                        {w} {t("docs.sensorHint")}
                      </div>
                    </div>
                  ))}

                  {/* needs_kind */}
                  {doc.status === "needs_kind" ? (
                    <div className="flex items-center gap-2.5">
                      <span className="flex-1 text-[12.5px] text-[var(--text-muted)]">
                        {t("docs.needsKind", {
                          conf: doc.doc_type ? doc.doc_type.confidence.toFixed(2) : "?",
                        })}
                      </span>
                      <select
                        className="h-8 rounded-[var(--r-md)] border border-[var(--border)] bg-card px-2 font-mono text-[12px]"
                        value={kindOverride[doc.id] ?? "invoice"}
                        onChange={(e) =>
                          setKindOverride((prev) => ({ ...prev, [doc.id]: e.target.value }))
                        }
                      >
                        {EXTRACTABLE_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      {canWrite ? (
                        <Button size="sm" disabled={busy} onClick={() => void onExtract(doc, kindOverride[doc.id] ?? "invoice")}>
                          <Sparkles /> {t("docs.extract")}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Typing explanation */}
                  {doc.doc_type && doc.status === "extracted" ? (
                    <div className="flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="text-[var(--text-muted)]">{t("docs.typing")}:</span>
                      <span className="chip chip-outline font-mono">
                        {doc.doc_type.kind} · {doc.doc_type.confidence.toFixed(2)}
                      </span>
                      {doc.doc_type.type_markers.length > 0 ? (
                        <span className="text-[11.5px] text-[var(--text-subtle)]">
                          {t("docs.markers")}: {doc.doc_type.type_markers.slice(0, 3).join(", ")}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Extracted fields */}
                  {doc.doc ? (
                    <details open>
                      <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-muted)]">
                        {t("docs.fields")}
                      </summary>
                      <div className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                        {docFieldRows(doc.doc).map(([k, v]) => (
                          <div key={k} className="kv-row">
                            <span className="k">{k}</span>
                            <span className="font-mono text-[12px]">{v}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}

                  {/* Checks */}
                  {doc.checks.length > 0 ? (
                    <div>
                      <div className="eyebrow mb-1.5">{t("docs.checksTitle")}</div>
                      <div className="flex flex-col gap-1">
                        {doc.checks.map((c, i) => (
                          <div key={i} className="flex flex-wrap items-center gap-2 text-[12px]">
                            {c.status === "ok" ? (
                              <Check className="h-3 w-3 text-[var(--success)]" />
                            ) : c.status === "mismatch" ? (
                              <span className="text-[var(--danger)]">✕</span>
                            ) : (
                              <span className="text-[var(--text-faint)]">·</span>
                            )}
                            <span className="font-mono text-[10.5px] text-[var(--text-subtle)]">
                              {c.check}
                            </span>
                            <span>{c.message}</span>
                            {c.expected != null && c.actual != null ? (
                              <span className="font-mono text-[11px] tabular-nums text-[var(--text-subtle)]">
                                expected {c.expected} · actual {c.actual}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* TULPAR result */}
                  {permit ? (
                    <div
                      className={cn(
                        "flex items-center gap-2.5 rounded-[var(--r-md)] px-3 py-2.5",
                        permit.status === "found"
                          ? "bg-[var(--success-tint)]"
                          : permit.status === "format_ok" || permit.status === "unavailable"
                            ? "bg-[var(--bg-muted)]"
                            : "bg-[var(--warn-tint)]",
                      )}
                    >
                      <PermitStatusBadge status={permit.status} />
                      <span className="min-w-0 flex-1 text-[12px] text-[var(--text-muted)]">
                        {permit.detail}
                      </span>
                      <span className="font-mono text-[10.5px] text-[var(--text-subtle)]">
                        {permit.cached ? t("docs.cached") : permit.source}
                      </span>
                      {canWrite && permit.cached ? (
                        <Button size="sm" variant="ghost" onClick={() => void onVerify(doc, true)}>
                          <RefreshCw /> {t("docs.verifyAgain")}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AttachDialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        pending={attach.isPending}
        onSubmit={async (payload) => {
          try {
            await attach.mutateAsync(payload);
            setAttachOpen(false);
            toast.success(t("docs.attached"));
          } catch (err) {
            toast.error(parseApiError(err).message);
          }
        }}
      />
    </div>
  );
}

// ── Attach dialog ────────────────────────────────────────────────────────────

function AttachDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: {
    kind: DocumentKind;
    number: string | null;
    doc_date: string | null;
    text?: string;
    ocr_job_id?: string;
    file_index?: number;
  }) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<DocumentKind>("auto");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState("");
  const [source, setSource] = useState<"text" | "ocr">("text");
  const [text, setText] = useState("");
  const [ocrJobId, setOcrJobId] = useState("");
  const [fileIndex, setFileIndex] = useState(0);

  function submit() {
    if (source === "text" && !text.trim()) {
      toast.error(t("docs.textRequired"));
      return;
    }
    if (source === "ocr" && !ocrJobId.trim()) {
      toast.error(t("docs.ocrJobRequired"));
      return;
    }
    onSubmit({
      kind,
      number: number.trim() || null,
      doc_date: date || null,
      ...(source === "text"
        ? { text: text.trim() }
        : { ocr_job_id: ocrJobId.trim(), file_index: fileIndex }),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col bg-[var(--bg)]">
        <SheetHeader>
          <SheetTitle>{t("docs.attachTitle")}</SheetTitle>
          <SheetDescription>{t("docs.attachDesc")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-auto px-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--text-muted)]">
                {t("docs.kind")}
              </span>
              <select
                className="h-9 rounded-[var(--r-md)] border border-[var(--border)] bg-card px-2 font-mono text-[12.5px]"
                value={kind}
                onChange={(e) => setKind(e.target.value as DocumentKind)}
              >
                {ALL_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k === "auto" ? `auto · ${t("docs.kindAuto")}` : k}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--text-muted)]">
                {t("docs.number")}
              </span>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--text-muted)]">
                {t("docs.date")}
              </span>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-1.5">
            {(["text", "ocr"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={cn(
                  "rounded-[var(--r-md)] border px-3 py-1.5 text-[12px]",
                  source === s
                    ? "border-[var(--primary)] bg-[var(--primary-tint)] text-[var(--primary)]"
                    : "border-[var(--border-strong)] bg-[hsl(var(--card))] text-[var(--text-muted)]",
                )}
              >
                {s === "text" ? t("docs.sourceTextOption") : t("docs.sourceOcrOption")}
              </button>
            ))}
          </div>

          {source === "text" ? (
            <Textarea
              className="min-h-[220px] font-mono text-[12px]"
              placeholder={t("docs.textPlaceholder")}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text-muted)]">
                  OCR job ID
                </span>
                <Input
                  className="font-mono"
                  placeholder="a1b2c3d4-…"
                  value={ocrJobId}
                  onChange={(e) => setOcrJobId(e.target.value)}
                />
                <span className="text-[11px] text-[var(--text-faint)]">{t("docs.ocrHint")}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text-muted)]">
                  {t("docs.fileIndex")}
                </span>
                <Input
                  className="w-24 font-mono tabular-nums"
                  type="number"
                  min={0}
                  value={fileIndex}
                  onChange={(e) => setFileIndex(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={pending} onClick={submit}>
            <Plus /> {t("docs.attachConfirm")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
