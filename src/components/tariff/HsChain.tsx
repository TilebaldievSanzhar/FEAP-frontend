import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { formatHsCode } from "@/api/dt-types";
import { hsSection } from "@/lib/tariff";
import { cn } from "@/lib/utils";

/** Раздел → Группа → Позиция → (Субпоз.) → 10-знак, derived from the code itself. */
export function HsChain({
  code,
  withSubheading,
  className,
}: {
  code: string;
  withSubheading?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const section = hsSection(code);
  const nodes = [
    ...(section ? [{ lab: t("tariff.chainSection"), val: section }] : []),
    { lab: t("tariff.chainGroup"), val: code.slice(0, 2) },
    { lab: t("tariff.chainHeading"), val: code.slice(0, 4) },
    ...(withSubheading ? [{ lab: t("tariff.chainSubheading"), val: `${code.slice(0, 4)} ${code.slice(4, 6)}` }] : []),
    { lab: t("tariff.chainCode"), val: formatHsCode(code) },
  ];
  return (
    <div className={cn("chain", className)}>
      {nodes.map((n, i) => (
        <Fragment key={i}>
          <div className={cn("chain-step !min-w-0 !py-1.5", i === nodes.length - 1 && "current")}>
            <span className="lvl">{n.lab}</span>
            <span className="code">{n.val}</span>
          </div>
          {i < nodes.length - 1 ? (
            <span className="chain-sep">
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
