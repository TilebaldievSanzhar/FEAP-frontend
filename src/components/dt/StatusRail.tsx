import { useTranslation } from "react-i18next";
import { Info, Sparkles, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DossierStatusBadge, DraftStatusBadge } from "@/components/dt/badges";
import type { DtDraftOut } from "@/api/dt-types";
import type { ExportFormat } from "@/api/dt";

interface Props {
  status: string;
  itemsCount: number;
  itemsWithoutCode: number;
  docsCount: number;
  docsExtracted: number;
  draft: DtDraftOut | null | undefined;
  latestVersion: number | null | undefined;
  canWrite: boolean;
  generating: boolean;
  onGenerate: () => void;
  onExport: (format: ExportFormat) => void;
  exportDisabled: boolean;
}

/** Right-hand sticky rail of the dossier workspace (design v2 StatusRail). */
export function StatusRail({
  status,
  itemsCount,
  itemsWithoutCode,
  docsCount,
  docsExtracted,
  draft,
  latestVersion,
  canWrite,
  generating,
  onGenerate,
  onExport,
  exportDisabled,
}: Props) {
  const { t } = useTranslation();
  const errors = draft?.findings.filter((f) => f.severity === "error").length ?? 0;
  const warnings = draft?.findings.filter((f) => f.severity === "warning").length ?? 0;

  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-4 overflow-auto border-l border-[var(--border)] bg-[hsl(var(--card))] px-4 py-5">
      <div>
        <div className="eyebrow mb-2">{t("ws.railTitle")}</div>
        <dl className="grid grid-cols-[minmax(90px,max-content)_1fr] gap-x-4 gap-y-1.5 text-[12px]">
          <dt className="text-[var(--text-subtle)]">{t("ws.railStatus")}</dt>
          <dd className="m-0">
            <DossierStatusBadge status={status} />
          </dd>
          <dt className="text-[var(--text-subtle)]">{t("ws.railItems")}</dt>
          <dd className="m-0 font-mono tabular-nums">
            {itemsCount}
            {itemsWithoutCode > 0 ? (
              <span className="text-[var(--warn-strong)]">
                {" "}
                · {t("decl.noCode")}: {itemsWithoutCode}
              </span>
            ) : null}
          </dd>
          <dt className="text-[var(--text-subtle)]">{t("ws.railDocs")}</dt>
          <dd className="m-0 font-mono tabular-nums">
            {docsCount} · {t("ws.railExtracted")}: {docsExtracted}
          </dd>
          <dt className="text-[var(--text-subtle)]">{t("ws.railDraft")}</dt>
          <dd className="m-0">
            {draft ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="font-mono">v{draft.version}</span>
                <DraftStatusBadge status={draft.status} />
              </span>
            ) : latestVersion ? (
              <span className="font-mono">v{latestVersion}</span>
            ) : (
              <span className="text-[var(--text-faint)]">—</span>
            )}
          </dd>
        </dl>
      </div>

      {draft ? (
        <div className="flex gap-3 text-[12px]">
          <span className="inline-flex items-center gap-1.5 text-[var(--danger)]">
            <X className="h-3 w-3" /> {errors} {t("ws.errors")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[var(--warn-strong)]">
            <TriangleAlert className="h-3 w-3" /> {warnings} {t("ws.warnings")}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {canWrite ? (
          <Button className="justify-center" onClick={onGenerate} disabled={generating}>
            <Sparkles /> {generating ? t("ws.generating") : t("ws.generateDraft")}
          </Button>
        ) : null}
        <div className="grid grid-cols-3 gap-1.5">
          {(["xlsx", "pdf", "xml"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant="outline"
              className="justify-center font-mono uppercase"
              disabled={exportDisabled}
              onClick={() => onExport(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 rounded-[var(--r-md)] bg-[var(--bg-muted)] px-3 py-2.5 text-[11.5px] leading-relaxed text-[var(--text-subtle)]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{t("ws.notFilingDisclaimer")}</span>
      </div>
    </aside>
  );
}
