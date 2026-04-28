import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Clock, Info, Shield } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
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
    <AppShell crumbs={[t("shell.crumbRefs"), t("shell.navNtm"), t("shell.crumbVerify")]}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("ntm.verifyHeading")}</h1>
        <p className="mt-1 max-w-[640px] text-sm text-[var(--text-muted)]">
          {t("ntm.verifyHint")}
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-6 shadow-[var(--shadow-xs)]">
          <NtmVerifyForm onSubmit={onSubmit} submitting={verify.isPending} />
        </section>

        <section className="flex flex-col gap-3">
          {verify.isPending ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : null}

          {verify.data ? (
            <>
              <div className="alert alert-info">
                <Info className="alert-ico h-4 w-4" />
                <div className="flex-1 text-[12.5px]">
                  <div className="mb-0.5 text-[13px] font-semibold">
                    {t("ntm.verifyDoneTitle", { count: verify.data.length })}
                  </div>
                  {t("ntm.verifyDoneText")}
                </div>
                <span className="chip chip-outline">
                  <Clock className="h-2.5 w-2.5" />
                  {t("ntm.verifyTime", { seconds: "6.8" })}
                </span>
              </div>

              {verify.data.length ? (
                verify.data.map((m) => <NtmMeasureCard key={m.id} measure={m} />)
              ) : (
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-6 text-sm text-[var(--text-muted)]">
                  {t("code.ntmEmpty")}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] p-6 text-center">
              <Shield className="mx-auto mb-2 h-8 w-8 text-[var(--primary)]" />
              <h3 className="m-0 text-base font-semibold">{t("ntm.verifyEmptyTitle")}</h3>
              <p className="m-0 mt-1 text-[13px] text-[var(--text-subtle)]">
                {t("ntm.verifyEmptyHint")}
              </p>
              <Button type="button" size="sm" variant="ghost" className="mt-2">
                {t("ntm.verifyEmptyAction")}
              </Button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/ntm/verify")({
  component: NtmVerifyPage,
});
