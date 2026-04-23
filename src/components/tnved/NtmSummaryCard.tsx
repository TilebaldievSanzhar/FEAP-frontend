import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NtmMeasure } from "@/api/types";

interface Props {
  measures: NtmMeasure[] | undefined;
}

export function NtmSummaryCard({ measures }: Props) {
  const { t } = useTranslation();
  if (!measures || measures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("code.ntmTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("code.ntmEmpty")}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("code.ntmTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {measures.map((m) => (
          <div key={m.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{m.type}</Badge>
              <span className="font-mono text-sm">{m.code}</span>
              <span className="font-medium">{m.title}</span>
            </div>
            {m.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
            ) : null}
            {m.countries?.length ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("code.ntmCountries")}: {m.countries.join(", ")}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
