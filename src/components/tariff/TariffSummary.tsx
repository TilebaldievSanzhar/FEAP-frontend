import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Flag } from "lucide-react";

import { RemedyBlock } from "@/components/tariff/RemedyBlock";
import { ConditionalVat } from "@/components/tariff/ConditionalVat";
import type { TnvedCodeInfo } from "@/api/types";
import { formatRate } from "@/lib/format";
import { formatIsoDate, splitFeeRule } from "@/lib/tariff";
import { cn } from "@/lib/utils";

export function RateRow({
  label,
  value,
  note,
  legal,
  mute,
  warn,
}: {
  label: string;
  value: string;
  note?: string | null;
  legal?: string | null;
  mute?: boolean;
  /** note — предупреждение (ставку нельзя применить). */
  warn?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(120px,200px)_1fr] items-baseline gap-4 border-b border-[var(--border)] py-2.5">
      <span className="text-[12.5px] text-[var(--text-subtle)]">{label}</span>
      <div>
        <span
          className={cn(
            "font-mono text-[15px] font-semibold tabular-nums",
            mute ? "text-[var(--text-faint)]" : "text-[var(--text)]",
          )}
        >
          {value}
        </span>
        {note ? (
          <span className={cn("ml-2.5 text-[12px]", warn ? "text-[var(--warn-strong)]" : "text-[var(--text-muted)]")}>
            {note}
          </span>
        ) : null}
        {legal ? <div className="mt-0.5 text-[11px] text-[var(--text-faint)]">{legal}</div> : null}
      </div>
    </div>
  );
}

interface Props {
  info: TnvedCodeInfo;
  origin?: string | null;
  /** Expand the first remedy description (the /calc result shows it open). */
  openFirstRemedy?: boolean;
  /** Hide the NTM line (passport shows it elsewhere). */
  hideNtm?: boolean;
}

/**
 * §3.2 — rates and rules for a code: ЕТТ duty, VAT, excise, customs fee,
 * trade remedies («может применяться»), conditional VAT, NTM summary.
 * Shows rates only — amounts belong to the DT draft.
 */
export function TariffSummary({ info, origin, openFirstRemedy, hideNtm }: Props) {
  const { t } = useTranslation();
  const fee = info.customs_fee ? splitFeeRule(info.customs_fee) : null;
  const ntm = info.ntm_measures ?? [];

  return (
    <div>
      <RateRow
        label={t("tariff.dutyEtt")}
        value={formatRate(info.duty_rate)}
        warn={Boolean(info.duty_info?.issue)}
        note={
          info.duty_info?.issue
            ? info.duty_info.issue
            : info.duty_info?.source === "ett_note"
              ? t("tariff.dutyTemporary", {
                  until: info.duty_info.valid_to ? formatIsoDate(info.duty_info.valid_to) : "—",
                  note: info.duty_info.note_id,
                  base: info.duty_info.base_rate,
                })
              : null
        }
        legal={
          info.duty_info?.source === "ett_note"
            ? info.duty_info.from_decision
            : info.duty_info?.version
              ? t("tariff.dutyEdition", { date: formatIsoDate(info.duty_info.version) })
              : null
        }
      />
      <RateRow
        label={t("tariff.vat")}
        value={formatRate(info.vat_rate)}
        note={info.vat_exemption ? t("tariff.vatExempt") : null}
        legal={info.vat_exemption?.legal_ref}
      />
      <RateRow
        label={t("tariff.excise")}
        value={info.excise_rate ? formatRate(info.excise_rate) : t("tariff.none")}
        mute={!info.excise_rate}
      />
      {fee ? (
        <RateRow label={t("tariff.fee")} value={fee.value} note={fee.note} legal={fee.legal} />
      ) : (
        <RateRow label={t("tariff.fee")} value={t("tariff.feeOff")} mute />
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {info.trade_remedies.map((m, i) => (
          <RemedyBlock
            key={m.measure_no}
            measure={m}
            origin={origin}
            defaultOpen={openFirstRemedy && i === 0}
          />
        ))}
        <ConditionalVat options={info.vat_conditional} />
        {hideNtm ? null : ntm.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--border)] px-3.5 py-2.5 text-[12.5px] text-[var(--text-muted)]">
            <Flag className="h-3.5 w-3.5 text-[var(--text-subtle)]" />
            {t("tariff.ntmNone")}
            <Link to="/ntm/verify" className="ml-auto text-[12px] text-[var(--primary)] no-underline hover:underline">
              {t("tariff.ntmRef")}
            </Link>
          </div>
        ) : (
          <div className="rounded-[var(--r-md)] border border-[var(--border)] px-3.5 py-2.5">
            <div className="flex items-center gap-2.5 text-[12.5px] font-medium">
              <Flag className="h-3.5 w-3.5 text-[var(--info)]" />
              {t("tariff.ntmFound", { n: ntm.length })}
              <Link
                to="/tnved/$code"
                params={{ code: info.code }}
                className="ml-auto text-[12px] font-normal text-[var(--primary)] no-underline hover:underline"
              >
                {t("tariff.ntmDetails")}
              </Link>
            </div>
            <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0 pl-6 text-[12px] text-[var(--text-muted)]">
              {ntm.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <span className="text-[var(--text)]">{m.measure_type}</span> · {m.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
