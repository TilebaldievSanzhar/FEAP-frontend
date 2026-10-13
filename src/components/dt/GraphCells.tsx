import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface GraphCellProps {
  g: string;
  label: string;
  value: React.ReactNode;
  /** Highlight (accent tint) — e.g. computed customs value. */
  hl?: boolean;
  /** Error highlight (danger tint) — cell referenced by an error finding. */
  err?: boolean;
  mono?: boolean;
  mute?: boolean;
  className?: string;
}

/** One графа of the ДТ draft view — bordered grid cell with «гр. N» tag. */
export function GraphCell({ g, label, value, hl, err, mono, mute, className }: GraphCellProps) {
  return (
    <div
      className={cn(
        "min-w-0 border-r border-t border-[var(--border)] px-4 py-2.5",
        err ? "bg-[var(--danger-tint)]" : hl ? "bg-[var(--primary-tint)]" : undefined,
        className,
      )}
    >
      <div className="mb-0.5 flex items-center gap-1.5">
        <span
          className={cn(
            "font-mono text-[9.5px] font-semibold",
            err ? "text-[var(--danger)]" : "text-[var(--text-faint)]",
          )}
        >
          гр. {g}
        </span>
        <span className="truncate text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
          {label}
        </span>
        {err ? (
          <TriangleAlert className="ml-auto h-[11px] w-[11px] shrink-0 text-[var(--danger)]" />
        ) : null}
      </div>
      <div
        className={cn(
          "truncate text-[12.5px] font-medium",
          mono && "font-mono tabular-nums",
          mute ? "text-[var(--text-faint)]" : "text-[var(--text)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

interface TotalCellProps {
  label: string;
  value: string;
  unit: string;
  warn?: boolean;
}

export function TotalCell({ label, value, unit, warn }: TotalCellProps) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))] px-4 py-3.5">
      <div className="eyebrow mb-1.5 text-[10px]">{label}</div>
      <div
        className={cn(
          "font-mono text-[18px] font-semibold tabular-nums",
          warn ? "text-[var(--warn-strong)]" : "text-[var(--text)]",
        )}
      >
        {value}
      </div>
      <div className="text-[11px] text-[var(--text-subtle)]">{unit}</div>
    </div>
  );
}
