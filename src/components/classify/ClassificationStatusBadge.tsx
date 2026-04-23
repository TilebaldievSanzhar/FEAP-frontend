import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { JobItemStatus, JobStatus } from "@/api/types";

type Status = JobStatus | JobItemStatus;

const VARIANT: Record<Status, Parameters<typeof Badge>[0]["variant"]> = {
  pending: "muted",
  running: "info",
  completed: "success",
  needs_input: "warning",
  partial: "warning",
  failed: "destructive",
  cancelled: "muted",
};

export function ClassificationStatusBadge({ status }: { status: Status }) {
  const { t } = useTranslation();
  return <Badge variant={VARIANT[status]}>{t(`status.${status}`)}</Badge>;
}
