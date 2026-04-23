import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ClassificationChain } from "./ClassificationChain";
import type { ClassificationResult } from "@/api/types";
import { formatRate } from "@/lib/format";

interface Props {
  result: ClassificationResult;
}

export function ClassificationResultCard({ result }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(result.final_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  const confidencePct = Math.round((result.confidence ?? 0) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="font-mono text-3xl">{result.code_formatted}</CardTitle>
            <p className="text-sm text-muted-foreground">{result.code_description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyCode}
              aria-label={t("actions.copyCode")}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("actions.copied") : t("actions.copy")}
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/tnved/$code" params={{ code: result.final_code }}>
                {t("actions.openInTree")}
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div>
          <h3 className="mb-2 text-sm font-medium">{t("result.chain")}</h3>
          <ClassificationChain chain={result.classification_chain} />
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <RateBox label={t("result.duty")} value={formatRate(result.duty_rate)} />
          <RateBox label={t("result.vat")} value={formatRate(result.vat_rate)} />
          <RateBox label={t("result.excise")} value={formatRate(result.excise_rate)} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">{t("result.confidence")}</span>
            <span className="font-mono">{confidencePct}%</span>
          </div>
          <Progress value={confidencePct} />
        </div>

        {result.opi_applied?.length ? (
          <div className="flex flex-wrap gap-2">
            {result.opi_applied.map((opi) => (
              <Badge key={opi} variant="info">
                {t("result.opi")} {opi}
              </Badge>
            ))}
          </div>
        ) : null}

        {result.risk_flags?.length ? (
          <div className="space-y-1">
            {result.risk_flags.map((flag) => (
              <div key={flag} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                <TriangleAlert className="h-4 w-4 mt-0.5" aria-hidden />
                <span>{flag}</span>
              </div>
            ))}
          </div>
        ) : null}

        {result.requires_human_review ? (
          <Badge variant="warning">{t("result.requiresReview")}</Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RateBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}
