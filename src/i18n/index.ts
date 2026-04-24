import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./ru.json";
import ky from "./ky.json";

export type Locale = "ru" | "ky";
export const SUPPORTED_LOCALES: Locale[] = ["ru", "ky"];

export function initI18n(defaultLocale: Locale = "ru") {
  if (i18n.isInitialized) return i18n;
  void i18n.use(initReactI18next).init({
    resources: {
      ru: { translation: ru },
      ky: { translation: ky },
    },
    lng: defaultLocale,
    fallbackLng: "ru",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return i18n;
}

export function setLocale(locale: Locale) {
  void i18n.changeLanguage(locale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export default i18n;
