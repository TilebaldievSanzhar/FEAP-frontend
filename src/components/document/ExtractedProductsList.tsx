import { useTranslation } from "react-i18next";
import type { ProductCard } from "@/api/types";

interface Props {
  products: ProductCard[];
  skippedLines?: number[];
}

export function ExtractedProductsList({ products, skippedLines }: Props) {
  const { t } = useTranslation();
  const included = products.filter((p) => !p.skipped);
  const skippedCount = (skippedLines?.length ?? 0) + products.filter((p) => p.skipped).length;

  if (!products.length) {
    return <p className="text-sm text-muted-foreground">{t("document.empty")}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t("document.totalCount", {
            total: products.length,
            included: included.length,
            skipped: skippedCount,
          })}
        </span>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-12 px-3 py-2">#</th>
              <th className="px-3 py-2">{t("document.col.description")}</th>
              <th className="w-28 px-3 py-2">{t("document.col.quantity")}</th>
              <th className="w-32 px-3 py-2">{t("document.col.country")}</th>
              <th className="w-28 px-3 py-2">{t("document.col.hint")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product, idx) => (
              <tr key={idx} className={product.skipped ? "opacity-60" : undefined}>
                <td className="px-3 py-2 font-mono text-xs">{idx + 1}</td>
                <td className="px-3 py-2">
                  <div className="truncate" title={product.normalized_description}>
                    {product.normalized_description}
                  </div>
                  {product.material || product.function ? (
                    <div className="truncate text-xs text-muted-foreground">
                      {[product.material, product.function].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">
                  {product.quantity != null ? `${product.quantity}${product.unit ? ` ${product.unit}` : ""}` : "—"}
                </td>
                <td className="px-3 py-2 text-xs">{product.country_of_origin ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{product.hs_code_hint ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
