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
    <div className={cn("chain", className)}>
      {chain.map((step, idx) => {
        const isLast = idx === chain.length - 1;
        const current = isLast || (highlightPending && isLast);
        return (
          <div key={`${step.level}-${step.code}-${idx}`} className="flex items-center gap-0.5">
            <div className={cn("chain-step", current && "current")} title={step.reasoning ?? undefined}>
              <span className="lvl">{step.level}</span>
              <span className="code">{step.code}</span>
              {step.name ? <span className="desc">{step.name}</span> : null}
            </div>
            {!isLast ? (
              <span className="chain-sep">
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
