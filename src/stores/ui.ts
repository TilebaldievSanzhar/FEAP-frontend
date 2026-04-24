import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/i18n";

export type Theme = "light" | "dark" | "system";

interface UiState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  locale: Locale | null;
  setLocale: (l: Locale) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      locale: null,
      setLocale: (locale) => set({ locale }),
    }),
    { name: "feap-ui", version: 2 },
  ),
);
