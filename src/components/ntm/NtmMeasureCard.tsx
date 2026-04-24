import { useTranslation } from "react-i18next";
import { CheckCircle2, HelpCircle, InfoIcon, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NtmMeasure, NtmVerifiedMeasure, NtmApplyStatus } from "@/api/types";

interface Props {
  measure: NtmMeasure | NtmVerifiedMeasure;
}

function isVerified(m: NtmMeasure | NtmVerifiedMeasure): m is NtmVerifiedMeasure {
  return "reasoning" in m && typeof (m as NtmVerifiedMeasure).reasoning !== "undefined";
}

const STATUS_STYLES: Record<NtmApplyStatus, string> = {
  applies: "border-emerald-400/60 bg-emerald-500/5",
  does_not_apply: "border-muted bg-muted/40",
  uncertain: "border-amber-400/60 bg-amber-500/5",
  may_apply: "border-sky-400/40 bg-sky-500/5",
  informational: "border-muted bg-muted/30",
};

const STATUS_ICON: Record<NtmApplyStatus, typeof CheckCircle2> = {
  applies: CheckCircle2,
  does_not_apply: XCircle,
  uncertain: HelpCircle,
  may_apply: InfoIcon,
  informational: InfoIcon,
};

const STATUS_TONE: Record<NtmApplyStatus, string> = {
  applies: "text-emerald-600",
  does_not_apply: "text-muted-foreground",
  uncertain: "text-amber-600",
  may_apply: "text-sky-600",
  informational: "text-muted-foreground",
};

export function NtmMeasureCard({ measure }: Props) {
  const { t } = useTranslation();
  const status = measure.status ?? "may_apply";
  const verified = isVerified(measure);
  const Icon = STATUS_ICON[status];

  return (
    <div className={cn("space-y-2 rounded-md border p-3", STATUS_STYLES[status])}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">{measure.measure_type}</Badge>
        {measure.scope ? (
          <Badge variant="outline" className="uppercase">
            {measure.scope}
          </Badge>
        ) : null}
        <span className="font-medium">{measure.name}</span>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 text-xs",
            STATUS_TONE[status],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {t(`ntm.status.${status}`)}
        </span>
      </div>
      {measure.qualifier ? (
        <p className="text-sm text-muted-foreground">{measure.qualifier}</p>
      ) : null}
      {measure.legal_basis ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">{t("ntm.legalBasis")}:</span> {measure.legal_basis}
        </p>
      ) : null}
      {measure.note ? (
        <p className="text-xs text-muted-foreground">{measure.note}</p>
      ) : null}
      {verified && measure.reasoning ? (
        <div className="rounded border-l-2 border-current/30 bg-background/60 p-2 text-xs">
          <span className="font-medium">{t("ntm.reasoning")}: </span>
          {measure.reasoning}
        </div>
      ) : null}
    </div>
  );
}
