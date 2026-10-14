import { useTranslation } from "react-i18next";
import { countryName } from "@/lib/tariff";
import { cn } from "@/lib/utils";

/** «CN КНР» — mono ISO code + localized short name. */
export function CountryChip({
  code,
  mute,
  className,
}: {
  code: string;
  mute?: boolean;
  className?: string;
}) {
  const { i18n } = useTranslation();
  const name = countryName(code, i18n.language);
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-[5px] whitespace-nowrap rounded-[var(--r-sm)] border border-[var(--border)] bg-[hsl(var(--card))] px-[7px] font-mono text-[11px]",
        mute ? "text-[var(--text-faint)]" : "text-[var(--text-muted)]",
        className,
      )}
    >
      <span className={cn("font-semibold", mute ? "text-[var(--text-faint)]" : "text-[var(--text)]")}>
        {code}
      </span>
      {name && name !== code ? <span className="font-sans">{name}</span> : null}
    </span>
  );
}
