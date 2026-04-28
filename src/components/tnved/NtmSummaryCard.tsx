import { useTranslation } from "react-i18next";
import { ChevronRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NtmMeasure } from "@/api/types";
import { cn } from "@/lib/utils";

interface Props {
  measures: NtmMeasure[] | undefined;
}

export function NtmSummaryCard({ measures }: Props) {
  const { t } = useTranslation();
  if (!measures || measures.length === 0) {
    return (
      <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-xs)]">
        <div className="text-[13px] text-[var(--text-muted)]">{t("code.ntmEmpty")}</div>
      </section>
    );
  }
  return (
    <section className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
        <Shield className="h-3.5 w-3.5 text-[var(--info)]" />
        <h3 className="text-sm font-semibold tracking-tight">{t("code.ntmTitle")}</h3>
        <span className="text-[12px] text-[var(--text-subtle)]">{t("code.ntmAsOf")}</span>
        <div className="flex-1" />
        <Button type="button" size="sm" variant="outline">
          {t("code.ntmCheckForProduct")}
        </Button>
      </div>
      <ul>
        {measures.map((m, i) => (
          <li
            key={m.id}
            className={cn(
              "flex items-center gap-3 px-6 py-3",
              i > 0 && "border-t border-[var(--border)]",
            )}
          >
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--primary-tint)] text-[var(--primary)]">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium">{m.measure_type}</span>
                <span
                  className={cn(
                    "chip",
                    m.status === "applies"
                      ? "chip-warn"
                      : m.status === "uncertain"
                        ? "chip-warn"
                        : "chip-neutral",
                  )}
                >
                  {m.scope ?? t("ntm.status.may_apply")}
                </span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-[var(--text-subtle)]">{m.name}</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="kicker">{t("ntm.documentLabel")}</div>
              <div className="text-[12.5px]">{m.qualifier ?? "—"}</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-faint)]" />
          </li>
        ))}
      </ul>
    </section>
  );
}
