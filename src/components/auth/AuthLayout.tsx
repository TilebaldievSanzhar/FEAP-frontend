import { useTranslation } from "react-i18next";

interface Props {
  children: React.ReactNode;
}

/** Split auth screen: inverted brand panel on the left, form on the right. */
export function AuthLayout({ children }: Props) {
  const { t } = useTranslation();
  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-2">
      <div className="hidden flex-col bg-[var(--text)] p-12 text-[var(--bg)] md:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-[var(--r-sm)] bg-[var(--bg)] font-mono text-[11px] font-semibold text-[var(--text)]">
            F
          </span>
          <span className="text-[15px] font-semibold tracking-tight">FEAP</span>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-4">
          <div className="font-serif max-w-[420px] text-[32px] italic leading-[1.25] tracking-tight opacity-90">
            {t("auth.tagline")}
          </div>
          <div className="max-w-[400px] text-[13.5px] leading-relaxed opacity-55">
            {t("auth.taglineSub")}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {[t("auth.badge1"), t("auth.badge2"), t("auth.badge3")].map((b) => (
              <span
                key={b}
                className="rounded-full border border-white/20 px-2.5 py-1 font-mono text-[11px] opacity-70 dark:border-black/20"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-[420px] text-[11.5px] leading-relaxed opacity-40">
          {t("auth.disclaimer")}
        </div>
      </div>

      <div className="grid place-items-center bg-[var(--bg)] p-10">
        <div className="flex w-[360px] max-w-full flex-col gap-5">{children}</div>
      </div>
    </div>
  );
}
