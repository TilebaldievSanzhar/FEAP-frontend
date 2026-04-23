import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ClassificationChainStep } from "@/api/types";
import { cn } from "@/lib/utils";

interface Props {
  chain: ClassificationChainStep[];
  className?: string;
}

export function CodeChain({ chain, className }: Props) {
  if (!chain?.length) return null;
  return (
    <ol className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)}>
      {chain.map((step, idx) => {
        const isLast = idx === chain.length - 1;
        return (
          <li key={`${step.level}-${step.code}-${idx}`} className="flex items-center gap-1.5">
            <Link
              to="/tnved/$code"
              params={{ code: step.code }}
              className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 hover:bg-accent"
            >
              <span className="text-xs uppercase text-muted-foreground">{step.level}</span>
              <span className="font-mono font-semibold">{step.code}</span>
              {step.name ? (
                <span className="truncate max-w-[16rem] text-muted-foreground">{step.name}</span>
              ) : null}
            </Link>
            {!isLast ? <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
