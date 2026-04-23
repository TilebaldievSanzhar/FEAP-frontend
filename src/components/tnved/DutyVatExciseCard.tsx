import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRate } from "@/lib/format";

interface Props {
  duty?: number | string | null;
  vat?: number | string | null;
  excise?: number | string | null;
}

export function DutyVatExciseCard({ duty, vat, excise }: Props) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("code.ratesTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Rate label={t("result.duty")} value={formatRate(duty)} />
        <Rate label={t("result.vat")} value={formatRate(vat)} />
        <Rate label={t("result.excise")} value={formatRate(excise)} />
      </CardContent>
    </Card>
  );
}

function Rate({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}
