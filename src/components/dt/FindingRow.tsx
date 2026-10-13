import { Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/api/dt-types";

const SEV: Record<Severity, { icon: typeof X; className: string }> = {
  error: { icon: X, className: "text-[var(--danger)]" },
  warning: { icon: TriangleAlert, className: "text-[var(--warn-strong)]" },
  info: { icon: Info, className: "text-[var(--info)]" },
};

interface Props {
  rule: string;
  severity: Severity;
  message: string;
  graph?: string | null;
  expected?: string | null;
  actual?: string | null;
  onGraphClick?: (graph: string) => void;
  last?: boolean;
}

/**
 * §11.3 of the DT spec — the single findings row used for ФЛК (F/W),
 * crosscheck (X), document checks (D) and risk signals (S).
 */
export function FindingRow({ rule, severity, message, graph, expected, actual, onGraphClick, last }: Props) {
  const sev = SEV[severity] ?? SEV.info;
  const Icon = sev.icon;
  return (
    <div
      className={cn(
        "grid grid-cols-[16px_auto_1fr] items-start gap-2.5 px-3.5 py-2.5",
        !last && "border-b border-[var(--border)]",
      )}
    >
      <Icon className={cn("mt-0.5 h-3.5 w-3.5", sev.className)} />
      <div className="flex flex-col items-start gap-1">
        <span
          className={cn(
            "inline-flex h-[18px] items-center rounded-[var(--r-sm)] border border-[var(--border)] bg-[hsl(var(--card))] px-1.5 font-mono text-[10px]",
            sev.className,
          )}
        >
          {rule}
        </span>
        {graph ? (
          <button
            type="button"
            onClick={onGraphClick ? () => onGraphClick(graph) : undefined}
            className={cn(
              "rounded-[var(--r-sm)] bg-[var(--primary-tint)] px-1.5 py-px font-mono text-[10.5px] text-[var(--primary)]",
              onGraphClick ? "cursor-pointer hover:bg-[var(--primary-tint-strong)]" : "cursor-default",
            )}
          >
            {graph} ↗
          </button>
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] leading-snug text-[var(--text)]">{message}</div>
        {expected != null && actual != null ? (
          <div className="mt-1 font-mono text-[11px] tabular-nums text-[var(--text-subtle)]">
            ожидалось <span className="text-[var(--success)]">{expected}</span> · фактически{" "}
            <span className="text-[var(--danger)]">{actual}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
