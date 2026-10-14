import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import type { VatConditional } from "@/api/types";
import { formatIsoDate } from "@/lib/tariff";

/** Conditional VAT benefits — shown, never applied (the declarant picks one in the item). */
export function ConditionalVat({ options }: { options: VatConditional[] }) {
  const { t } = useTranslation();
  if (!options.length) return null;
  const rates = [...new Set(options.map((o) => o.rate))].join(" / ");
  return (
    <div className="grid grid-cols-[18px_1fr] gap-2.5 rounded-[var(--r-md)] border border-[var(--info-border)] bg-[var(--info-tint)] px-3.5 py-3">
      <Info className="mt-px h-[15px] w-[15px] text-[var(--info)]" />
      <div className="flex flex-col gap-2.5">
        <div className="text-[13px] font-semibold">
          {t("tariff.vatConditionalTitle")} <span className="font-mono">{rates}</span>{" "}
          {t("tariff.vatConditionalTail")}
        </div>
        {options.map((o, i) => (
          <div key={o.source} className={i ? "border-t border-dashed border-[var(--info-border)] pt-2.5" : ""}>
            <div className="text-[12.5px] leading-normal text-[var(--text)]">{o.condition}</div>
            <div className="mt-[3px] text-[11px] text-[var(--text-subtle)]">
              {o.legal_ref}
              {o.note ? ` · ${o.note}` : ""}
              {o.valid_to ? ` · ${t("tariff.validTo", { date: formatIsoDate(o.valid_to) })}` : ""}
            </div>
          </div>
        ))}
        <div className="text-[11.5px] text-[var(--text-muted)]">{t("tariff.vatConditionalHint")}</div>
      </div>
    </div>
  );
}
