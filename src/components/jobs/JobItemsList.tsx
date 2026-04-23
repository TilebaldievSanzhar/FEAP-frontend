import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { JobItemCard } from "./JobItemCard";
import type { JobItem, JobItemStatus } from "@/api/types";

interface Props {
  items: JobItem[] | undefined;
  isLoading: boolean;
  filter?: JobItemStatus | null;
}

export function JobItemsList({ items, isLoading, filter }: Props) {
  const { t } = useTranslation();

  if (isLoading && !items) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={idx} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const filtered = filter ? items?.filter((i) => i.status === filter) : items;

  if (!filtered?.length) {
    return (
      <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
        {filter ? t("jobs.emptyFiltered") : t("jobs.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((item) => (
        <JobItemCard key={item.item_id} item={item} />
      ))}
    </div>
  );
}
