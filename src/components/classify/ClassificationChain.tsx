import { ChevronRight } from "lucide-react";
import type { ClassificationChainStep } from "@/api/types";
import { cn } from "@/lib/utils";

interface Props {
  chain: ClassificationChainStep[];
  highlightPending?: boolean;
  className?: string;
}

export function ClassificationChain({ chain, highlightPending, className }: Props) {
  if (!chain?.length) return null;

  return (
    <ol className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)}>
      {chain.map((step, idx) => {
        const isLast = idx === chain.length - 1;
        return (
          <li key={`${step.level}-${step.code}-${idx}`} className="flex items-center gap-1.5">
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1",
                isLast && highlightPending
                  ? "border-amber-400/60 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                  : "bg-muted",
              )}
              title={step.reasoning ?? undefined}
            >
              <span className="text-xs uppercase text-muted-foreground">{step.level}</span>
              <span className="font-mono font-semibold">{step.code}</span>
              {step.name ? (
                <span className="truncate max-w-[14rem] text-muted-foreground">{step.name}</span>
              ) : null}
            </div>
            {!isLast ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
