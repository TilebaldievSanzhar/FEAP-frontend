import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check } from "lucide-react";

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
import type { CatalogItemOut } from "@/api/dt-types";

export interface CatalogEditorPayload {
  sku: string;
  description: string;
  hs_code: string | null;
  attributes: Record<string, unknown>;
}

function attrsToText(attrs: Record<string, unknown>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k} = ${String(v)}`)
    .join("\n");
}

function textToAttrs(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of text.split("\n")) {
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

/**
 * Create/edit sheet for a product record (catalog upsert by SKU).
 * `item` edits an existing record; `initial` prefills a new one (e.g. from /calc).
 * Remount with a new `key` to reset the fields.
 */
export function CatalogEditor({
  open,
  onOpenChange,
  item,
  initial,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: CatalogItemOut | null;
  initial?: Partial<CatalogEditorPayload>;
  onSubmit: (payload: CatalogEditorPayload) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const [sku, setSku] = useState(item?.sku ?? initial?.sku ?? "");
  const [description, setDescription] = useState(item?.description ?? initial?.description ?? "");
  const [hsCode, setHsCode] = useState(item?.hs_code ?? initial?.hs_code ?? "");
  const [attrsText, setAttrsText] = useState(
    attrsToText(item?.attributes ?? initial?.attributes ?? {}),
  );

  function submit() {
    if (!sku.trim() || !description.trim()) {
      toast.error(t("catalog.requiredHint"));
      return;
    }
    if (hsCode && !/^\d{10}$/.test(hsCode)) {
      toast.error(t("catalog.codeFormat"));
      return;
    }
    onSubmit({
      sku: sku.trim(),
      description: description.trim(),
      hs_code: hsCode || null,
      attributes: textToAttrs(attrsText),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col bg-[var(--bg)]">
        <SheetHeader>
          <SheetTitle>{item ? t("catalog.editTitle") : t("catalog.createTitle")}</SheetTitle>
          <SheetDescription>{t("catalog.upsertHint")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-auto px-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">SKU *</span>
            <Input
              className="font-mono"
              value={sku}
              disabled={Boolean(item)}
              autoFocus={!item}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">
              {t("catalog.colDesc")} *
            </span>
            <Textarea className="min-h-[70px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">
              {t("catalog.colCode")}
            </span>
            <Input
              className="font-mono"
              maxLength={10}
              placeholder="8509800000"
              value={hsCode}
              onChange={(e) => setHsCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">
              {t("catalog.colAttrs")}
            </span>
            <Textarea
              className="min-h-[100px] font-mono text-[12px]"
              placeholder={t("catalog.attrsPlaceholder")}
              value={attrsText}
              onChange={(e) => setAttrsText(e.target.value)}
            />
            <span className="text-[11px] text-[var(--text-faint)]">{t("catalog.attrsHint")}</span>
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={pending} onClick={submit}>
            <Check /> {t("catalog.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
