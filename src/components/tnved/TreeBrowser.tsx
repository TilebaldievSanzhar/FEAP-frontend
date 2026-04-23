import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTreeNode } from "@/api/tnved";
import type { TnvedNode } from "@/api/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface NodeProps {
  node: TnvedNode;
  depth: number;
}

function NodeRow({ node, depth }: NodeProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { data, isLoading, isError } = useTreeNode(open ? node.code : null);
  const canExpand = node.has_children;

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-1 rounded px-2 py-1 hover:bg-accent",
          "transition-colors",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {canExpand ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
            aria-label={open ? t("actions.collapse") : t("actions.expand")}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="h-5 w-5" />
        )}
        <Link
          to="/tnved/$code"
          params={{ code: node.code }}
          className="flex items-center gap-2 text-sm"
        >
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs uppercase text-muted-foreground">
            {node.level}
          </span>
          <span className="font-mono font-semibold">{node.code_formatted ?? node.code}</span>
          <span className="text-muted-foreground">{node.name}</span>
        </Link>
      </div>

      {open ? (
        <ul>
          {isLoading ? (
            <li
              className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              <Loader2 className="h-4 w-4 animate-spin" /> {t("tree.loading")}
            </li>
          ) : isError ? (
            <li
              className="px-2 py-1 text-sm text-destructive"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              {t("errors.generic")}
            </li>
          ) : data?.length ? (
            data.map((child) => (
              <NodeRow key={child.code} node={child} depth={depth + 1} />
            ))
          ) : (
            <li
              className="px-2 py-1 text-sm text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              {t("tree.empty")}
            </li>
          )}
        </ul>
      ) : null}
    </li>
  );
}

export function TreeBrowser() {
  const { data, isLoading, isError } = useTreeNode(null);
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t("errors.generic")}</p>;
  }

  if (!data?.length) {
    return <p className="text-sm text-muted-foreground">{t("tree.empty")}</p>;
  }

  return (
    <ul className="divide-y rounded-md border">
      {data.map((node) => (
        <NodeRow key={node.code} node={node} depth={0} />
      ))}
    </ul>
  );
}
