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
        className={cn("tree-node")}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => canExpand && setOpen((v) => !v)}
      >
        {canExpand ? (
          <span className="caret">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        ) : (
          <span className="caret" />
        )}
        <Link
          to="/tnved/$code"
          params={{ code: node.code }}
          className="flex flex-1 items-center gap-2 truncate no-underline"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="code">{node.code_formatted ?? node.code}</span>
          <span className="flex-1 truncate text-[var(--text-muted)]">{node.name}</span>
        </Link>
      </div>

      {open ? (
        <ul className="pl-[18px]">
          {isLoading ? (
            <li
              className="flex items-center gap-2 px-2 py-1 text-[12px] text-[var(--text-subtle)]"
              style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
            >
              <Loader2 className="h-3 w-3 animate-spin" /> {t("tree.loading")}
            </li>
          ) : isError ? (
            <li
              className="px-2 py-1 text-[12px] text-[var(--danger)]"
              style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
            >
              {t("errors.generic")}
            </li>
          ) : data?.length ? (
            data.map((child) => <NodeRow key={child.code} node={child} depth={depth + 1} />)
          ) : (
            <li
              className="px-2 py-1 text-[12px] text-[var(--text-subtle)]"
              style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
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
    return <p className="text-sm text-[var(--danger)]">{t("errors.generic")}</p>;
  }

  if (!data?.length) {
    return <p className="text-sm text-[var(--text-muted)]">{t("tree.empty")}</p>;
  }

  return (
    <ul>
      {data.map((node) => (
        <NodeRow key={node.code} node={node} depth={0} />
      ))}
    </ul>
  );
}
