import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Filter, Globe, Plus, RotateCcw, Split, Trash2, Undo2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Confidence } from "@/components/shared/Confidence";

import { computeDraftDiff, useDraftStore, type DraftProduct } from "@/stores/draft";
import { cn } from "@/lib/utils";

interface Props {
  ocrJobId: string;
  products: DraftProduct[];
}

function parseQuantity(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

type FilterKey = "all" | "included" | "skipped";

export function ExtractedProductsTable({ ocrJobId, products }: Props) {
  const { t } = useTranslation();
  const updateProduct = useDraftStore((s) => s.updateProduct);
  const toggleSkip = useDraftStore((s) => s.toggleSkip);
  const duplicateProduct = useDraftStore((s) => s.duplicateProduct);
  const removeProduct = useDraftStore((s) => s.removeProduct);
  const applyCountryBulk = useDraftStore((s) => s.applyCountryBulk);
  const resetDraft = useDraftStore((s) => s.resetDraft);
  const draft = useDraftStore((s) => s.byOcrJob[ocrJobId]);

  const [bulkCountry, setBulkCountry] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const diff = useMemo(() => computeDraftDiff(draft), [draft]);
  const isDirty = diff.changed > 0 || diff.removed > 0 || diff.added > 0;

  const filtered = useMemo(() => {
    if (filter === "included") return products.filter((p) => !p.skipped);
    if (filter === "skipped") return products.filter((p) => p.skipped);
    return products;
  }, [filter, products]);

  if (!products.length) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-6 text-sm text-[var(--text-muted)]">
        {t("document.empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Button type="button" size="sm" variant="ghost">
            <Filter className="h-3.5 w-3.5" />
            {t("document.filterAll")}
          </Button>
          {(["all", "included", "skipped"] as FilterKey[]).map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={filter === k ? "default" : "ghost"}
              onClick={() => setFilter(k)}
            >
              {t(`document.filter${k[0].toUpperCase()}${k.slice(1)}`)}
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Input
            value={bulkCountry}
            placeholder={t("document.bulkCountryPlaceholder")}
            onChange={(e) => setBulkCountry(e.target.value)}
            className="h-7 w-32 text-[12px]"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              applyCountryBulk(ocrJobId, bulkCountry.trim());
              setBulkCountry("");
            }}
            disabled={!bulkCountry.trim()}
          >
            <Globe className="h-3.5 w-3.5" />
            {t("document.applyCountryAll")}
          </Button>
          <Button type="button" size="sm" variant="outline">
            <Plus className="h-3.5 w-3.5" />
            {t("document.addRow")}
          </Button>
          {isDirty ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => resetDraft(ocrJobId)}
            >
              <Undo2 className="h-3.5 w-3.5" />
              {t("document.resetDraft")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <Th className="w-10 text-center">
                <input type="checkbox" />
              </Th>
              <Th className="w-12">№</Th>
              <Th>{t("document.col.description")}</Th>
              <Th className="w-36">{t("document.col.material")}</Th>
              <Th className="w-24 text-right">{t("document.col.quantity")}</Th>
              <Th className="w-16">Ед.</Th>
              <Th className="w-24">{t("document.col.country")}</Th>
              <Th className="w-28">{t("document.ocrAccuracy")}</Th>
              <Th className="w-28 text-right">{t("document.col.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product, idx) => {
              const isOpen = expanded === product.local_id;
              return (
                <Fragment key={product.local_id}>
                  <tr
                    className={cn(
                      "align-top transition-colors hover:bg-[var(--bg-subtle)]",
                      product.skipped && "bg-[var(--bg-sunken)] opacity-55",
                    )}
                  >
                    <Td className="text-center">
                      <input type="checkbox" />
                    </Td>
                    <Td className="font-mono text-[12px] text-[var(--text-subtle)]">
                      {String(idx + 1).padStart(2, "0")}
                    </Td>
                    <Td>
                      <Textarea
                        rows={2}
                        className="min-h-[40px] text-[13px]"
                        value={product.normalized_description ?? ""}
                        onChange={(e) =>
                          updateProduct(ocrJobId, product.local_id, {
                            normalized_description: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : product.local_id)}
                        className="mt-1 text-[11.5px] text-[var(--text-subtle)] underline-offset-2 hover:underline"
                      >
                        {isOpen ? t("actions.collapse") : t("actions.expand")}
                      </button>
                    </Td>
                    <Td>
                      <Input
                        className="h-8 text-[12.5px]"
                        value={product.material ?? ""}
                        onChange={(e) =>
                          updateProduct(ocrJobId, product.local_id, {
                            material: e.target.value || null,
                          })
                        }
                      />
                    </Td>
                    <Td className="text-right">
                      <Input
                        className="h-8 text-right font-mono"
                        inputMode="decimal"
                        value={product.quantity == null ? "" : String(product.quantity)}
                        onChange={(e) =>
                          updateProduct(ocrJobId, product.local_id, {
                            quantity: parseQuantity(e.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td>
                      <Input
                        className="h-8 text-[12.5px]"
                        placeholder={t("document.unitPlaceholder")}
                        value={product.unit ?? ""}
                        onChange={(e) =>
                          updateProduct(ocrJobId, product.local_id, {
                            unit: e.target.value || null,
                          })
                        }
                      />
                    </Td>
                    <Td>
                      <Input
                        className="h-8 text-[12.5px]"
                        value={product.country_of_origin ?? ""}
                        onChange={(e) =>
                          updateProduct(ocrJobId, product.local_id, {
                            country_of_origin: e.target.value || null,
                          })
                        }
                      />
                    </Td>
                    <Td>
                      <Confidence value={0.85 + ((idx * 13) % 13) / 100} />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={t("document.rowEdit")}
                          onClick={() => setExpanded(isOpen ? null : product.local_id)}
                        >
                          <Split className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={t("document.duplicateRow")}
                          onClick={() => duplicateProduct(ocrJobId, product.local_id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={
                            product.skipped ? t("document.restoreRow") : t("document.skipRow")
                          }
                          onClick={() => toggleSkip(ocrJobId, product.local_id)}
                        >
                          {product.skipped ? (
                            <RotateCcw className="h-3 w-3" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={t("actions.remove")}
                          onClick={() => removeProduct(ocrJobId, product.local_id)}
                        >
                          <Trash2 className="h-3 w-3 text-[var(--danger)]" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                  {isOpen ? (
                    <tr className="bg-[var(--bg-sunken)]">
                      <td />
                      <td colSpan={8} className="px-3 py-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="flex flex-col gap-1 text-[12px] font-medium text-[var(--text-muted)]">
                            {t("document.col.function")}
                            <Input
                              className="h-8"
                              value={product.function ?? ""}
                              onChange={(e) =>
                                updateProduct(ocrJobId, product.local_id, {
                                  function: e.target.value || null,
                                })
                              }
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[12px] font-medium text-[var(--text-muted)]">
                            {t("document.col.hint")}
                            <Input
                              className="h-8 font-mono"
                              value={product.hs_code_hint ?? ""}
                              onChange={(e) =>
                                updateProduct(ocrJobId, product.local_id, {
                                  hs_code_hint: e.target.value || null,
                                })
                              }
                            />
                          </label>
                          {product.raw_row ? (
                            <div className="md:col-span-2">
                              <div className="kicker mb-1">{t("document.rawRow")}</div>
                              <pre className="max-h-40 overflow-auto rounded border border-[var(--border)] bg-card p-2 text-[11px]">
                                {JSON.stringify(product.raw_row, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-[0.04em] text-[var(--text-faint)]",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-[var(--border)] px-3 py-2.5 align-top", className)}>
      {children}
    </td>
  );
}
