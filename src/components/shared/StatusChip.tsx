import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Pencil,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusKey =
  | "completed"
  | "running"
  | "pending"
  | "needs_input"
  | "partial"
  | "failed"
  | "cancelled"
  | "draft";

const MAP: Record<
  StatusKey,
  {
    chip: string;
    icon: typeof CheckCircle2;
    spin?: boolean;
    i18nKey: string;
  }
> = {
  completed: { chip: "chip-success", icon: CheckCircle2, i18nKey: "status.completed" },
  running: { chip: "chip-info", icon: Loader2, spin: true, i18nKey: "status.running" },
  pending: { chip: "chip-neutral", icon: Clock, i18nKey: "status.pending" },
  needs_input: { chip: "chip-warn", icon: HelpCircle, i18nKey: "status.needs_input" },
  partial: { chip: "chip-warn", icon: HelpCircle, i18nKey: "status.partial" },
  failed: { chip: "chip-danger", icon: TriangleAlert, i18nKey: "status.failed" },
  cancelled: { chip: "chip-neutral", icon: X, i18nKey: "status.cancelled" },
  draft: { chip: "chip-outline", icon: Pencil, i18nKey: "status.draft" },
};

interface Props {
  status: StatusKey;
  showIcon?: boolean;
  className?: string;
}

export function StatusChip({ status, showIcon = true, className }: Props) {
  const { t } = useTranslation();
  const cfg = MAP[status] ?? MAP.pending;
  const Icon = cfg.icon;
  return (
    <span className={cn("chip", cfg.chip, className)}>
      {showIcon ? (
        <Icon
          className={cn("h-2.5 w-2.5", cfg.spin && "animate-spin [animation-duration:1.2s]")}
          aria-hidden
        />
      ) : null}
      {t(cfg.i18nKey)}
    </span>
  );
}
