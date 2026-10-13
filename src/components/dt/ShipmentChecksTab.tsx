import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Info, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AICard } from "@/components/dt/AICard";
import { FindingRow } from "@/components/dt/FindingRow";
import { VerdictBadge } from "@/components/dt/badges";
import { useAdvise, useCrosscheck } from "@/api/dt";
import { ApiError } from "@/api/client";
import { parseApiError } from "@/lib/errors";

interface Props {
  shipmentId: string;
  canWrite: boolean;
}

export function ShipmentChecksTab({ shipmentId, canWrite }: Props) {
  const { t } = useTranslation();
  const crosscheck = useCrosscheck(shipmentId);
  const advise = useAdvise(shipmentId);

  async function runCrosscheck() {
    try {
      await crosscheck.mutateAsync();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.warning(parseApiError(err).message);
      } else {
        toast.error(parseApiError(err).message);
      }
    }
  }

  async function runAdvise() {
    try {
      await advise.mutateAsync();
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  const cc = crosscheck.data;
  const adv = advise.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        {/* ─── Crosscheck ─── */}
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-semibold">{t("checks.crosscheckTitle")}</span>
            <span className="chip chip-outline font-mono">POST /crosscheck</span>
            <div className="flex-1" />
            {canWrite ? (
              <Button size="sm" variant="outline" disabled={crosscheck.isPending} onClick={() => void runCrosscheck()}>
                {cc ? <RefreshCw /> : <Sparkles />}
                {crosscheck.isPending
                  ? t("checks.running")
                  : cc
                    ? t("checks.rerun")
                    : t("checks.run")}
              </Button>
            ) : null}
          </div>

          {!cc && !crosscheck.isPending ? (
            <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] p-6 text-center text-[12.5px] text-[var(--text-subtle)]">
              {t("checks.crosscheckIntro")}
            </div>
          ) : null}

          {cc ? (
            <>
              {/* numeric findings */}
              <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
                <div className="border-b border-[var(--border)] px-3.5 py-2.5 text-[12px] font-semibold">
                  {t("checks.numericTitle")}
                </div>
                {cc.findings.length === 0 ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 text-[11.5px] text-[var(--success)]">
                    <Check className="h-3 w-3" /> {t("checks.numericClean")}
                  </div>
                ) : (
                  cc.findings.map((f, i) => (
                    <FindingRow
                      key={i}
                      rule={f.rule}
                      severity={f.severity}
                      message={f.message}
                      graph={f.graph}
                      expected={f.details.expected ?? null}
                      actual={f.details.actual ?? null}
                      last={i === cc.findings.length - 1}
                    />
                  ))
                )}
              </div>

              {/* parties */}
              <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
                <div className="flex items-center gap-2 border-b border-[var(--border)] px-3.5 py-2.5 text-[12px] font-semibold">
                  {t("checks.partiesTitle")}
                  <Sparkles className="h-3 w-3 text-[var(--primary)]" />
                </div>
                {cc.parties.length === 0 ? (
                  <div className="px-3.5 py-2.5 text-[12px] text-[var(--text-subtle)]">
                    {t("checks.noParties")}
                  </div>
                ) : (
                  cc.parties.map((p, i) => (
                    <div
                      key={p.pair_id + i}
                      className="border-b border-[var(--border)] px-3.5 py-2.5 last:border-b-0"
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <VerdictBadge verdict={p.verdict} />
                        <span className="text-[12px] font-semibold">{p.entity}</span>
                        <span className="ml-auto font-mono text-[10.5px] tabular-nums text-[var(--text-subtle)]">
                          conf {p.match_confidence.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 text-[11.5px]">
                        <div className="text-[var(--text-muted)]">
                          <span className="block text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                            {t("checks.inDoc")} · {p.doc_label}
                          </span>
                          {p.doc_value}
                        </div>
                        <div className="text-[var(--text-muted)]">
                          <span className="block text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                            {t("checks.inShipment")}
                          </span>
                          {p.shipment_value}
                        </div>
                      </div>
                      <div className="mt-1 text-[11px] italic text-[var(--text-subtle)]">
                        {p.reasoning}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* invoice lines */}
              <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
                <div className="border-b border-[var(--border)] px-3.5 py-2.5 text-[12px] font-semibold">
                  {t("checks.linesTitle")}
                </div>
                <div className="flex flex-col gap-1 px-3.5 py-2.5">
                  {cc.invoice_lines.length === 0 ? (
                    <span className="text-[12px] text-[var(--text-subtle)]">{t("checks.noLines")}</span>
                  ) : (
                    cc.invoice_lines.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 font-mono text-[11.5px]">
                        <span className="text-[var(--text-subtle)]">
                          {t("checks.line")} {m.doc_line_no}
                        </span>
                        <span className="text-[var(--text-faint)]">→</span>
                        {m.shipment_position != null ? (
                          <span className="font-medium">
                            {t("checks.position")} {m.shipment_position}
                          </span>
                        ) : (
                          <span className="rounded-[var(--r-sm)] bg-[var(--warn-tint)] px-1.5 text-[var(--warn-strong)]">
                            {t("checks.noMatch")}
                          </span>
                        )}
                        <span className="ml-auto tabular-nums text-[var(--text-faint)]">
                          {m.match_confidence.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {cc.dropped.length > 0 ? (
                  <details className="px-3.5 pb-2.5">
                    <summary className="cursor-pointer text-[11px] text-[var(--text-faint)]">
                      {t("checks.dropped")} · {cc.dropped.length}
                    </summary>
                    <div className="mt-1 flex flex-col gap-1 text-[11px] text-[var(--text-subtle)]">
                      {cc.dropped.map((d, i) => (
                        <span key={i}>{d}</span>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            </>
          ) : null}
        </section>

        {/* ─── Risk advisor ─── */}
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-semibold">{t("checks.advisorTitle")}</span>
            <span className="chip chip-outline font-mono">POST /advise</span>
            <div className="flex-1" />
            {canWrite ? (
              <Button size="sm" variant="outline" disabled={advise.isPending} onClick={() => void runAdvise()}>
                <Sparkles />
                {advise.isPending ? t("checks.running") : adv ? t("checks.rerun") : t("checks.askAdvice")}
              </Button>
            ) : null}
          </div>

          {!adv && !advise.isPending ? (
            <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] p-6 text-center text-[12.5px] text-[var(--text-subtle)]">
              {t("checks.advisorIntro")}
            </div>
          ) : null}

          {adv ? (
            <>
              {/* signals */}
              <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
                <div className="border-b border-[var(--border)] px-3.5 py-2.5 text-[12px] font-semibold">
                  {t("checks.signalsTitle")}
                </div>
                {adv.signals.length === 0 ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 text-[11.5px] text-[var(--success)]">
                    <Check className="h-3 w-3" /> {t("checks.noSignals")}
                  </div>
                ) : (
                  adv.signals.map((s, i) => (
                    <FindingRow
                      key={s.id}
                      rule={s.id}
                      severity={s.severity}
                      message={s.message}
                      last={i === adv.signals.length - 1}
                    />
                  ))
                )}
              </div>

              {/* advices */}
              {adv.advices.map((a, i) => (
                <AICard
                  key={i}
                  title={`${t("checks.advice")} · ${a.signal_id}`}
                  why={undefined}
                  evidence={a.evidence.map((e) => `${e.source}: ${e.detail}`)}
                >
                  <span className="font-semibold">{t("checks.adviceWhat")}:</span> {a.explanation}
                  <br />
                  <span className="font-semibold">{t("checks.adviceDo")}:</span> {a.recommendation}
                </AICard>
              ))}

              {/* code checks */}
              <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
                <div className="flex items-center gap-2 border-b border-[var(--border)] px-3.5 py-2.5 text-[12px] font-semibold">
                  {t("checks.codeChecksTitle")}
                  <Sparkles className="h-3 w-3 text-[var(--primary)]" />
                </div>
                {adv.code_checks.length === 0 ? (
                  <div className="px-3.5 py-2.5 text-[12px] text-[var(--text-subtle)]">
                    {t("checks.noCodeChecks")}
                  </div>
                ) : (
                  adv.code_checks.map((c, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[auto_1fr] items-baseline gap-3 border-b border-[var(--border)] px-3.5 py-2.5 last:border-b-0"
                    >
                      <span className="font-mono text-[11px] text-[var(--text-subtle)]">
                        {t("checks.pos")} {c.position}
                      </span>
                      <div>
                        <VerdictBadge verdict={c.verdict} />
                        <div className="mt-1 text-[11.5px] leading-snug text-[var(--text-subtle)]">
                          {c.reasoning}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {adv.dropped.length > 0 ? (
                <details>
                  <summary className="cursor-pointer text-[11px] text-[var(--text-faint)]">
                    {t("checks.dropped")} · {adv.dropped.length}
                  </summary>
                  <div className="mt-1 flex flex-col gap-1 text-[11px] text-[var(--text-subtle)]">
                    {adv.dropped.map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      <div className="alert alert-info max-w-[860px]">
        <Info className="alert-ico h-4 w-4" />
        <div className="text-[11.5px]">{t("checks.notPersisted")}</div>
      </div>
    </div>
  );
}
