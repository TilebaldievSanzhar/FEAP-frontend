import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, ImagePlus, Info, Loader2, ScanSearch, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IMAGE_MAX_FILES, IMAGE_MAX_MB, useImageCard, type ImageCardOut } from "@/api/calc";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { CurrencySelect, OriginSelect } from "./LotParamsPanel";
import { CALC_CURRENCIES, cleanDecimal } from "./lot";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/** What the recognized card hands to classification and the calc form. */
export interface PhotoClassifyInput {
  description: string;
  origin: string | null;
  manufacturer: string;
  unitPrice: string;
  currency: string;
  qtyUnit: string;
}

interface Props {
  busy: boolean;
  disabled?: boolean;
  onClassify: (input: PhotoClassifyInput) => void;
}

/**
 * v3.1 §2 — «Фото или скриншот»: up to 4 images of one product (drop, pick or
 * paste) → POST /calc/from-image → editable card → classification. The price
 * is what the model read on the image; the user confirms it.
 */
export function PhotoInput({ busy, disabled, onClassify }: Props) {
  const { t } = useTranslation();
  const recognize = useImageCard();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [card, setCard] = useState<ImageCardOut | null>(null);
  const [form, setForm] = useState<PhotoClassifyInput | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const ok = incoming.filter((f) => ACCEPT.includes(f.type) && f.size <= IMAGE_MAX_MB * 1024 * 1024);
    if (ok.length < incoming.length) toast.error(t("calc.photoRejected", { mb: IMAGE_MAX_MB }));
    if (!ok.length) return;
    setFiles((prev) => [...prev, ...ok].slice(0, IMAGE_MAX_FILES));
    setCard(null);
  }

  // Ctrl+V a screenshot anywhere on the page while this mode is open.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const images = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (images.length) {
        e.preventDefault();
        addFiles(images);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- addFiles only reads setters and t
  }, []);

  async function onRecognize() {
    try {
      const out = await recognize.mutateAsync({ files, note });
      setCard(out);
      const p = out.prefill;
      setForm({
        description: out.classify_description,
        origin: p.origin_country,
        manufacturer: p.manufacturer ?? "",
        unitPrice: p.unit_price ?? "",
        currency: p.currency && CALC_CURRENCIES.includes(p.currency) ? p.currency : "USD",
        qtyUnit: p.qty_unit ?? "шт",
      });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  const c = card?.card;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1.5 rounded-[var(--r-lg)] border border-dashed px-4 py-6 text-center",
          dragOver ? "border-[var(--primary)] bg-[var(--primary-tint)]" : "border-[var(--border-strong)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)]",
        )}
      >
        <ImagePlus className="h-5 w-5 text-[var(--text-subtle)]" />
        <span className="text-[13px] font-medium">{t("calc.photoDrop")}</span>
        <span className="text-[11.5px] text-[var(--text-subtle)]">
          {t("calc.photoHint", { n: IMAGE_MAX_FILES, mb: IMAGE_MAX_MB })}
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length ? (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative h-[72px] w-[72px] overflow-hidden rounded-[var(--r-md)] border border-[var(--border)]">
              <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={t("calc.photoRemove")}
                onClick={() => {
                  setFiles(files.filter((_, j) => j !== i));
                  setCard(null);
                }}
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-[var(--text-muted)]">
          {t("calc.photoNote")} <span className="font-normal text-[var(--text-faint)]">{t("calc.optional")}</span>
        </span>
        <Input value={note} maxLength={1000} placeholder={t("calc.photoNotePlaceholder")} onChange={(e) => setNote(e.target.value)} />
      </label>

      {!card ? (
        <Button
          type="button"
          size="lg"
          className="self-start"
          disabled={!files.length || recognize.isPending || disabled}
          onClick={() => void onRecognize()}
        >
          {recognize.isPending ? <Loader2 className="animate-spin" /> : <ScanSearch />}
          {recognize.isPending ? t("calc.photoRecognizing") : t("calc.photoRecognize")}
        </Button>
      ) : null}

      {c && !c.is_product ? (
        <div className="alert alert-warn">
          <Info className="alert-ico h-4 w-4" />
          <div className="text-[12.5px]">
            {c.not_product_reason || t("calc.photoNotProduct")}{" "}
            <Link to="/document/upload" className="text-[var(--primary)] underline">
              {t("calc.photoToOcr")}
            </Link>
          </div>
        </div>
      ) : null}

      {c && c.is_product && form ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--info-border)] bg-[hsl(var(--card))]">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] bg-[var(--info-tint)] px-4 py-2.5">
            <span className="text-[13px] font-semibold">
              {t("calc.photoRecognized")} · {c.product_identification}
            </span>
            <span className="text-[11px] text-[var(--text-subtle)]">{t("calc.photoImages", { n: card?.images ?? 0 })}</span>
          </div>
          <div className="flex flex-col gap-3 px-4 py-3.5">
            {c.title_original ? (
              <div className="text-[11.5px] text-[var(--text-subtle)]">{c.title_original}</div>
            ) : null}
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--text-muted)]">{t("calc.photoDescription")}</span>
              <Textarea
                className="min-h-[96px] text-[13px]"
                maxLength={2000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            {c.specs.length ? (
              <div className="flex flex-wrap gap-1">
                {c.specs.map((s, i) => (
                  <span key={i} className="chip chip-outline text-[11px]">
                    {s.name}: {s.value}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="border-t border-[var(--border)] pt-3 text-[12px] font-medium text-[var(--text-muted)]">
              {t("calc.photoPrefill")}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] text-[var(--text-muted)]">{t("calc.origin")}</span>
                <OriginSelect value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} />
                {c.origin_evidence ? (
                  <span className="text-[11px] leading-snug text-[var(--text-subtle)]">{c.origin_evidence}</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] text-[var(--text-muted)]">
                  {t("calc.unitPrice")} <span className="text-[var(--text-faint)]">{t("calc.fromImage")}</span>
                </span>
                <div className="grid grid-cols-[1fr_76px_64px] gap-1.5">
                  <Input
                    className="border-[var(--info-border)] bg-[var(--info-tint)] font-mono tabular-nums"
                    inputMode="decimal"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: cleanDecimal(e.target.value) })}
                  />
                  <CurrencySelect value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} />
                  <Input
                    className="text-[12.5px]"
                    maxLength={20}
                    value={form.qtyUnit}
                    onChange={(e) => setForm({ ...form, qtyUnit: e.target.value })}
                  />
                </div>
                {c.price?.min_order_qty ? (
                  <span className="text-[11px] text-[var(--text-subtle)]">
                    {t("calc.photoMoq", { qty: c.price.min_order_qty })}
                  </span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-[12px] text-[var(--text-muted)]">{t("calc.manufacturer")}</span>
                <Input value={form.manufacturer} maxLength={300} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
              </label>
            </div>
            {c.missing_info.length ? (
              <div className="flex gap-1.5 text-[11.5px] leading-snug text-[var(--text-muted)]">
                <Info className="mt-0.5 h-3 w-3 shrink-0 text-[var(--info)]" />
                {t("calc.photoMissing", { items: c.missing_info.join("; ") })}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="lg"
                disabled={busy || disabled || form.description.trim().length < 3}
                onClick={() => onClassify(form)}
              >
                {busy ? <Loader2 className="animate-spin" /> : null}
                {t("calc.submitDesc")}
                {!busy ? <ArrowRight /> : null}
              </Button>
              <button
                type="button"
                className="text-[12px] text-[var(--text-subtle)] underline"
                onClick={() => {
                  setCard(null);
                  setForm(null);
                }}
              >
                {t("calc.photoAgain")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
