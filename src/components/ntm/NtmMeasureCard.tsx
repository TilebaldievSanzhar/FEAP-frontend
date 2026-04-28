import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Info,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  NtmApplyStatus,
  NtmMeasure,
  NtmVerifiedMeasure,
} from "@/api/types";

interface Props {
  measure: NtmMeasure | NtmVerifiedMeasure;
}

function isVerified(m: NtmMeasure | NtmVerifiedMeasure): m is NtmVerifiedMeasure {
  return "reasoning" in m && typeof (m as NtmVerifiedMeasure).reasoning !== "undefined";
}

const STATUS_TONE: Record<
  NtmApplyStatus,
  { chip: string; iconBg: string; iconColor: string; Icon: typeof CheckCircle2 }
> = {
  applies: {
    chip: "chip-success",
    iconBg: "bg-[var(--success-tint)]",
    iconColor: "text-[var(--success)]",
    Icon: CheckCircle2,
  },
  does_not_apply: {
    chip: "chip-neutral",
    iconBg: "bg-[var(--bg-muted)]",
    iconColor: "text-[var(--text-muted)]",
    Icon: XCircle,
  },
  uncertain: {
    chip: "chip-warn",
    iconBg: "bg-[var(--warn-tint)]",
    iconColor: "text-[var(--warn-strong)]",
    Icon: HelpCircle,
  },
  may_apply: {
    chip: "chip-info",
    iconBg: "bg-[var(--info-tint)]",
    iconColor: "text-[var(--info)]",
    Icon: Info,
  },
  informational: {
    chip: "chip-neutral",
    iconBg: "bg-[var(--bg-muted)]",
    iconColor: "text-[var(--text-muted)]",
    Icon: Info,
  },
};

export function NtmMeasureCard({ measure }: Props) {
  const { t } = useTranslation();
  const status = (measure.status ?? "may_apply") as NtmApplyStatus;
  const verified = isVerified(measure);
  const tone = STATUS_TONE[status];

  return (
    <article className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
      <div className="flex flex-col gap-3 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[10px]", tone.iconBg)}>
            <tone.Icon className={cn("h-4 w-4", tone.iconColor)} />
          </div>
          <div className="flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="font-mono text-[12.5px] font-medium text-[var(--text-subtle)]">
                {measure.measure_type}
              </span>
              <span className={cn("chip", tone.chip)}>{t(`ntm.status.${status}`)}</span>
            </div>
            <div className="text-[14px] font-semibold">{measure.name}</div>
          </div>
          <Button type="button" size="sm" variant="ghost">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>

        {verified && measure.reasoning ? (
          <div className="pl-[52px] text-[13px] leading-snug text-[var(--text-muted)]">
            <div className="kicker mb-1">{t("ntm.rationale")}</div>
            {measure.reasoning}
          </div>
        ) : measure.qualifier ? (
          <div className="pl-[52px] text-[13px] text-[var(--text-muted)]">{measure.qualifier}</div>
        ) : null}

        {measure.legal_basis ? (
          <div className="flex flex-wrap items-center gap-2 pl-[52px]">
            <div className="kicker w-full">{t("ntm.citations")}</div>
            <span className="chip chip-outline font-mono text-[11px]">
              <BookOpen className="h-2.5 w-2.5" />
              {measure.legal_basis}
            </span>
          </div>
        ) : null}

        {measure.note ? (
          <div className="pl-[52px]">
            <div className="alert">
              <ArrowRight className="alert-ico h-4 w-4" />
              <div className="text-[12.5px]">
                <div className="mb-0.5 text-[12px] font-semibold">{t("ntm.todo")}</div>
                {measure.note}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
