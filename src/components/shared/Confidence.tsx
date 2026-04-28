import { cn } from "@/lib/utils";

interface Props {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function Confidence({ value, className, showLabel = true }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const tone = value >= 0.8 ? "" : value >= 0.6 ? "mid" : "low";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("conf-bar", tone, "flex-1")}>
        <i style={{ width: `${pct}%` }} />
      </div>
      {showLabel ? (
        <span className="font-mono text-[12px] font-medium tabular-nums">{pct}%</span>
      ) : null}
    </div>
  );
}
