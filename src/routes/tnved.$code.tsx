import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useCodeLookup } from "@/api/tnved";
import { CodeChain } from "@/components/tnved/CodeChain";
import { DutyVatExciseCard } from "@/components/tnved/DutyVatExciseCard";
import { NtmSummaryCard } from "@/components/tnved/NtmSummaryCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CodePage() {
  const { code } = Route.useParams();
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCodeLookup(code);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("code.notFound")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("errors.generic")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-3xl">{data.code_formatted}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>{data.name}</p>
          <CodeChain chain={data.chain} />
        </CardContent>
      </Card>

      <DutyVatExciseCard
        duty={data.duty_rate}
        vat={data.vat_rate}
        excise={data.excise_rate}
      />

      <NtmSummaryCard measures={data.ntm_measures} />
    </div>
  );
}

export const Route = createFileRoute("/tnved/$code")({
  component: CodePage,
});
