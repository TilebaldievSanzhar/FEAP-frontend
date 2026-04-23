import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./ru.json";

export function initI18n(defaultLocale: "ru" | "ky" = "ru") {
  if (i18n.isInitialized) return i18n;
  void i18n.use(initReactI18next).init({
    resources: { ru: { translation: ru } },
    lng: defaultLocale,
    fallbackLng: "ru",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return i18n;
}

export default i18n;
