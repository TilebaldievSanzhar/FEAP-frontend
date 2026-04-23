import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ExternalLink, Search } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NtmMeasureCard } from "@/components/ntm/NtmMeasureCard";
import { useNtm } from "@/api/ntm";

function NtmLookupPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [code, setCode] = useState<string | null>(null);

  const { data, isFetching, isError } = useNtm(code);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const clean = query.replace(/\D/g, "");
    if (clean.length < 2) return;
    setCode(clean);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("ntm.lookupTitle")}</CardTitle>
          <CardDescription>{t("ntm.lookupDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2" onSubmit={onSubmit}>
            <Input
              inputMode="numeric"
              placeholder={t("ntm.codePlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit">
              <Search className="h-4 w-4" />
              {t("ntm.lookupSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {code ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-mono">{code}</CardTitle>
                <CardDescription>{t("ntm.measuresFor")}</CardDescription>
              </div>
              <Button asChild size="sm" variant="secondary">
                <Link to="/tnved/$code" params={{ code }}>
                  <ExternalLink className="h-4 w-4" />
                  {t("actions.openInTree")}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isFetching && !data ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : isError ? (
              <p className="text-sm text-destructive">{t("errors.generic")}</p>
            ) : !data?.length ? (
              <p className="text-sm text-muted-foreground">{t("code.ntmEmpty")}</p>
            ) : (
              data.map((m) => <NtmMeasureCard key={m.id} measure={m} />)
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/ntm/lookup")({
  component: NtmLookupPage,
});
