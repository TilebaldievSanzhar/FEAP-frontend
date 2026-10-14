import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Что за товар → Код → Расчёт и ограничения → Дальше. */
export function CalcStepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const { t } = useTranslation();
  const steps = [t("calc.step1"), t("calc.step2"), t("calc.step3"), t("calc.step4")];
  return (
    <ol className="m-0 mt-[18px] flex list-none flex-wrap items-center gap-y-2 p-0">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const on = n === step;
        return (
          <Fragment key={n}>
            <li className="flex items-center gap-2" aria-current={on ? "step" : undefined}>
              <span
                className={cn(
                  "grid h-[22px] w-[22px] place-items-center rounded-full font-mono text-[11px] font-semibold",
                  done && "bg-[var(--text)] text-[var(--bg)]",
                  on && "bg-[var(--primary)] text-white",
                  !done && !on && "border-[1.5px] border-[var(--border-strong)] text-[var(--text-faint)]",
                )}
              >
                {done ? <Check className="h-[11px] w-[11px]" strokeWidth={2.4} /> : n}
              </span>
              <span
                className={cn(
                  "text-[12.5px]",
                  on ? "font-semibold text-[var(--text)]" : done ? "text-[var(--text-muted)]" : "text-[var(--text-faint)]",
                )}
              >
                {label}
              </span>
            </li>
            {i < steps.length - 1 ? (
              <li
                aria-hidden
                className={cn("mx-3 h-px w-12", done ? "bg-[var(--text)]" : "bg-[var(--border-strong)]")}
              />
            ) : null}
          </Fragment>
        );
      })}
    </ol>
  );
}
