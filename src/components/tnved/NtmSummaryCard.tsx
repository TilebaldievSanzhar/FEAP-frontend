import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NtmMeasureCard } from "@/components/ntm/NtmMeasureCard";
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
          <NtmMeasureCard key={m.id} measure={m} />
        ))}
      </CardContent>
    </Card>
  );
}
