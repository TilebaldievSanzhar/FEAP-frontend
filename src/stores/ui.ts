import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface UiState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "feap-ui" },
  ),
);
