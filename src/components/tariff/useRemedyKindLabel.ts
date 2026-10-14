import { useTranslation } from "react-i18next";

/** «Антидемпинговая пошлина» etc.; unknown kinds fall back to a generic label. */
export function useRemedyKindLabel() {
  const { t } = useTranslation();
  return (kind: string) => t(`tariff.kind.${kind}`, { defaultValue: t("tariff.kind.other") });
}
