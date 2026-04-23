import { useTranslation } from "react-i18next";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NtmMeasure, NtmVerifiedMeasure } from "@/api/types";

interface Props {
  measure: NtmMeasure | NtmVerifiedMeasure;
}

function isVerified(m: NtmMeasure | NtmVerifiedMeasure): m is NtmVerifiedMeasure {
  return "status" in m && typeof (m as NtmVerifiedMeasure).status === "string";
}

const STATUS_STYLES: Record<NtmVerifiedMeasure["status"], string> = {
  applies: "border-emerald-400/60 bg-emerald-500/5",
  does_not_apply: "border-muted bg-muted/40",
  uncertain: "border-amber-400/60 bg-amber-500/5",
};

export function NtmMeasureCard({ measure }: Props) {
  const { t } = useTranslation();
  const verified = isVerified(measure);
  const statusStyle = verified ? STATUS_STYLES[measure.status] : "";

  const Icon = verified
    ? measure.status === "applies"
      ? CheckCircle2
      : measure.status === "does_not_apply"
        ? XCircle
        : HelpCircle
    : null;

  const iconTone = verified
    ? measure.status === "applies"
      ? "text-emerald-600"
      : measure.status === "does_not_apply"
        ? "text-muted-foreground"
        : "text-amber-600"
    : "";

  return (
    <div className={cn("space-y-2 rounded-md border p-3", statusStyle)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">{measure.type}</Badge>
        <span className="font-mono text-sm">{measure.code}</span>
        <span className="font-medium">{measure.title}</span>
        {verified && Icon ? (
          <span className={cn("ml-auto inline-flex items-center gap-1 text-xs", iconTone)}>
            <Icon className="h-4 w-4" aria-hidden />
            {t(`ntm.status.${measure.status}`)}
          </span>
        ) : null}
      </div>
      {measure.description ? (
        <p className="text-sm text-muted-foreground">{measure.description}</p>
      ) : null}
      {measure.countries?.length ? (
        <p className="text-xs text-muted-foreground">
          {t("code.ntmCountries")}: {measure.countries.join(", ")}
        </p>
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
