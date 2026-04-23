import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NtmVerifyForm, type VerifyFormValues } from "@/components/ntm/NtmVerifyForm";
import { NtmMeasureCard } from "@/components/ntm/NtmMeasureCard";
import { useNtmVerify } from "@/api/ntm";
import { parseApiError } from "@/lib/errors";

function NtmVerifyPage() {
  const { t } = useTranslation();
  const verify = useNtmVerify();

  async function onSubmit(values: VerifyFormValues) {
    try {
      await verify.mutateAsync(values);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("ntm.verifyTitle")}</CardTitle>
          <CardDescription>{t("ntm.verifyDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <NtmVerifyForm onSubmit={onSubmit} submitting={verify.isPending} />
        </CardContent>
      </Card>

      {verify.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {verify.data ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("ntm.verifyResultTitle")}</CardTitle>
            <CardDescription>
              {t("ntm.verifyResultCount", { count: verify.data.length })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {verify.data.length ? (
              verify.data.map((m) => <NtmMeasureCard key={m.id} measure={m} />)
            ) : (
              <p className="text-sm text-muted-foreground">{t("code.ntmEmpty")}</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/ntm/verify")({
  component: NtmVerifyPage,
});
