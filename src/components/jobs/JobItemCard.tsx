import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ClassificationStatusBadge } from "@/components/classify/ClassificationStatusBadge";
import { ClassificationChain } from "@/components/classify/ClassificationChain";
import type { JobItem } from "@/api/types";
import { formatRate } from "@/lib/format";

interface Props {
  item: JobItem;
}

export function JobItemCard({ item }: Props) {
  const { t } = useTranslation();
  const confidencePct = item.result ? Math.round((item.result.confidence ?? 0) * 100) : 0;

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#{item.position + 1}</span>
            <ClassificationStatusBadge status={item.status} />
          </div>
          {item.result ? (
            <Button asChild size="sm" variant="secondary">
              <Link to="/tnved/$code" params={{ code: item.result.final_code }}>
                {t("actions.openInTree")}
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="text-sm">{item.product_description}</div>
      </CardHeader>

      <CardContent className="space-y-3">
        {item.result ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xl font-semibold">
                {item.result.code_formatted}
              </span>
              <span className="text-sm text-muted-foreground">
                {item.result.code_description}
              </span>
            </div>

            <ClassificationChain chain={item.result.classification_chain} />

            <div className="grid grid-cols-3 gap-2 text-xs">
              <Rate label={t("result.duty")} value={formatRate(item.result.duty_rate)} />
              <Rate label={t("result.vat")} value={formatRate(item.result.vat_rate)} />
              <Rate label={t("result.excise")} value={formatRate(item.result.excise_rate)} />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span>{t("result.confidence")}</span>
                <span className="font-mono">{confidencePct}%</span>
              </div>
              <Progress value={confidencePct} />
            </div>
          </>
        ) : null}

        {item.partial ? (
          <div className="space-y-2 rounded-md border border-amber-400/40 bg-amber-500/5 p-3">
            <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {t("jobs.item.needsInputTitle")}
            </div>
            <ClassificationChain
              chain={item.partial.classification_chain_so_far}
              highlightPending
            />
            <ul className="list-disc pl-5 text-sm">
              {item.partial.questions.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {item.status === "failed" && item.error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {item.error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Rate({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}
