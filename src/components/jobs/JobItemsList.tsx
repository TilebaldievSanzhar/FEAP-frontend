import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Download, Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/StatusChip";
import { Confidence } from "@/components/shared/Confidence";
import type { JobItem, JobItemStatus } from "@/api/types";
import { cn } from "@/lib/utils";
import { formatRate } from "@/lib/format";

interface Props {
  items: JobItem[] | undefined;
  isLoading: boolean;
  filter?: JobItemStatus | null;
  onFilterChange?: (status: JobItemStatus | null) => void;
  totalCounts?: { all: number; completed: number; needs_input: number; running: number; pending: number; failed: number };
}

const FILTERS: Array<{ key: "all" | JobItemStatus; i18nKey: string }> = [
  { key: "all", i18nKey: "jobs.filterAll" },
  { key: "completed", i18nKey: "status.completed" },
  { key: "needs_input", i18nKey: "status.needs_input" },
  { key: "running", i18nKey: "status.running" },
  { key: "pending", i18nKey: "status.pending" },
  { key: "failed", i18nKey: "status.failed" },
];

export function JobItemsList({
  items,
  isLoading,
  filter,
  onFilterChange,
  totalCounts,
}: Props) {
  const { t } = useTranslation();

  if (isLoading && !items) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={idx} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const filtered = filter ? items?.filter((i) => i.status === filter) : items;

  return (
    <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-2.5">
        {FILTERS.map((f) => {
          const active = (filter ?? "all") === f.key;
          const count = totalCounts ? totalCounts[f.key as keyof typeof totalCounts] : null;
          return (
            <Button
              key={f.key}
              type="button"
              size="sm"
              variant={active ? "default" : "ghost"}
              onClick={() => onFilterChange?.(f.key === "all" ? null : (f.key as JobItemStatus))}
            >
              {t(f.i18nKey)}
              {count != null ? ` (${count})` : ""}
            </Button>
          );
        })}
        <div className="flex-1" />
        <Button type="button" size="sm" variant="outline">
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
        <Button type="button" size="sm" variant="outline">
          <RefreshCw className="h-3.5 w-3.5" />
          {t("jobs.retryErrors")}
        </Button>
      </div>

      {!filtered?.length ? (
        <div className="p-6 text-center text-sm text-[var(--text-muted)]">
          {filter ? t("jobs.emptyFiltered") : t("jobs.empty")}
        </div>
      ) : (
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <Th className="w-12">№</Th>
              <Th>{t("jobs.colItem")}</Th>
              <Th className="w-40">{t("jobs.colCode")}</Th>
              <Th className="w-20">{t("jobs.colDuty")}</Th>
              <Th className="w-32">{t("result.confidence")}</Th>
              <Th className="w-40">{t("jobs.colStatus")}</Th>
              <Th className="w-12">{""}</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const conf = item.result?.confidence;
              return (
                <tr
                  key={item.item_id}
                  className="transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <Td className="font-mono text-[12px] text-[var(--text-subtle)]">
                    {String(item.position + 1).padStart(2, "0")}
                  </Td>
                  <Td>
                    <div className="max-w-[420px] truncate font-medium">
                      {item.product_description}
                    </div>
                    {item.partial?.questions?.[0] ? (
                      <div className="mt-0.5 text-[11.5px] text-[var(--warn-strong)]">
                        ? {item.partial.questions[0]}
                      </div>
                    ) : null}
                    {item.error ? (
                      <div className="mt-0.5 text-[11.5px] text-[var(--danger)]">
                        ✗ {item.error}
                      </div>
                    ) : null}
                  </Td>
                  <Td>
                    {item.result ? (
                      <Link
                        to="/tnved/$code"
                        params={{ code: item.result.final_code }}
                        className="font-mono font-medium text-[var(--primary)] no-underline hover:underline"
                      >
                        {item.result.code_formatted}
                      </Link>
                    ) : item.status === "running" ? (
                      <Loader2 className="h-3 w-3 animate-spin text-[var(--info)]" />
                    ) : (
                      <span className="font-mono text-[var(--text-faint)]">—</span>
                    )}
                  </Td>
                  <Td className="font-mono">
                    {item.result?.duty_rate != null
                      ? formatRate(item.result.duty_rate)
                      : <span className="text-[var(--text-faint)]">—</span>}
                  </Td>
                  <Td>
                    {conf != null ? (
                      <Confidence value={conf} />
                    ) : (
                      <span className="text-[var(--text-faint)]">—</span>
                    )}
                  </Td>
                  <Td>
                    <StatusChip status={item.status} />
                  </Td>
                  <Td>
                    <Button type="button" size="sm" variant="ghost" aria-label="open">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
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
    <td
      className={cn(
        "border-b border-[var(--border)] px-3 py-2.5 align-middle",
        className,
      )}
    >
      {children}
    </td>
  );
}
