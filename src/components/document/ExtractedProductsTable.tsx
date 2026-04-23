import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, RotateCcw, Trash2, Undo2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const [expanded, setExpanded] = useState<string | null>(null);

  const diff = useMemo(() => computeDraftDiff(draft), [draft]);
  const included = products.filter((p) => !p.skipped);
  const skippedCount = products.filter((p) => p.skipped).length;
  const isDirty = diff.changed > 0 || diff.removed > 0 || diff.added > 0;

  if (!products.length) {
    return <p className="text-sm text-muted-foreground">{t("document.empty")}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-muted-foreground">
          {t("document.totalCount", {
            total: products.length,
            included: included.length,
            skipped: skippedCount,
          })}
        </div>
        {isDirty ? (
          <div className="flex items-center gap-2">
            <Badge variant="warning">
              {t("document.draftDirty", {
                changed: diff.changed,
                removed: diff.removed,
                added: diff.added,
              })}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => resetDraft(ocrJobId)}
            >
              <Undo2 className="h-4 w-4" />
              {t("document.resetDraft")}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">{t("document.bulkCountryLabel")}</span>
          <Input
            value={bulkCountry}
            placeholder={t("document.bulkCountryPlaceholder")}
            onChange={(e) => setBulkCountry(e.target.value)}
            className="h-8 w-48"
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            applyCountryBulk(ocrJobId, bulkCountry.trim());
            setBulkCountry("");
          }}
        >
          {t("document.bulkCountryApply")}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-12 px-3 py-2">#</th>
              <th className="px-3 py-2">{t("document.col.description")}</th>
              <th className="w-40 px-3 py-2">{t("document.col.material")}</th>
              <th className="w-32 px-3 py-2">{t("document.col.quantity")}</th>
              <th className="w-32 px-3 py-2">{t("document.col.country")}</th>
              <th className="w-28 px-3 py-2">{t("document.col.hint")}</th>
              <th className="w-36 px-3 py-2 text-right">{t("document.col.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product, idx) => {
              const isOpen = expanded === product.local_id;
              return (
                <Fragment key={product.local_id}>
                  <tr
                    className={cn(
                      product.skipped && "opacity-50",
                      "align-top",
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <Textarea
                        className="min-h-[40px] text-sm"
                        rows={2}
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
                        className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                      >
                        {isOpen ? t("actions.collapse") : t("actions.expand")}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8"
                        value={product.material ?? ""}
                        onChange={(e) =>
                          updateProduct(ocrJobId, product.local_id, {
                            material: e.target.value || null,
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-8 w-20"
                          inputMode="decimal"
                          value={product.quantity == null ? "" : String(product.quantity)}
                          onChange={(e) =>
                            updateProduct(ocrJobId, product.local_id, {
                              quantity: parseQuantity(e.target.value),
                            })
                          }
                        />
                        <Input
                          className="h-8 w-12"
                          placeholder={t("document.unitPlaceholder")}
                          value={product.unit ?? ""}
                          onChange={(e) =>
                            updateProduct(ocrJobId, product.local_id, {
                              unit: e.target.value || null,
                            })
                          }
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8"
                        value={product.country_of_origin ?? ""}
                        onChange={(e) =>
                          updateProduct(ocrJobId, product.local_id, {
                            country_of_origin: e.target.value || null,
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 font-mono text-xs"
                        value={product.hs_code_hint ?? ""}
                        onChange={(e) =>
                          updateProduct(ocrJobId, product.local_id, {
                            hs_code_hint: e.target.value || null,
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={
                            product.skipped
                              ? t("document.restoreRow")
                              : t("document.skipRow")
                          }
                          onClick={() => toggleSkip(ocrJobId, product.local_id)}
                        >
                          {product.skipped ? (
                            <RotateCcw className="h-4 w-4" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={t("document.duplicateRow")}
                          onClick={() => duplicateProduct(ocrJobId, product.local_id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={t("actions.remove")}
                          onClick={() => removeProduct(ocrJobId, product.local_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="bg-muted/30">
                      <td />
                      <td colSpan={6} className="px-3 py-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="flex flex-col gap-1 text-xs">
                            <span className="font-medium">
                              {t("document.col.function")}
                            </span>
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
                          {product.raw_row ? (
                            <div className="md:col-span-2">
                              <div className="mb-1 text-xs font-medium text-muted-foreground">
                                {t("document.rawRow")}
                              </div>
                              <pre className="max-h-40 overflow-auto rounded border bg-background p-2 text-xs">
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
