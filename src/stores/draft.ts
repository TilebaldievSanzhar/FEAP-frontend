import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProductCard } from "@/api/types";

export interface DraftProduct extends ProductCard {
  local_id: string;
}

export interface OcrDraft {
  baseline: DraftProduct[];
  current: DraftProduct[];
  updatedAt: number;
}

interface DraftState {
  byOcrJob: Record<string, OcrDraft>;
  initDraft: (ocrJobId: string, products: ProductCard[]) => DraftProduct[];
  updateProduct: (ocrJobId: string, localId: string, patch: Partial<ProductCard>) => void;
  toggleSkip: (ocrJobId: string, localId: string) => void;
  duplicateProduct: (ocrJobId: string, localId: string) => void;
  removeProduct: (ocrJobId: string, localId: string) => void;
  applyCountryBulk: (ocrJobId: string, country: string) => void;
  resetDraft: (ocrJobId: string) => void;
  clearDraft: (ocrJobId: string) => void;
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function wrap(products: ProductCard[]): DraftProduct[] {
  return products.map((p) => ({ ...p, local_id: makeId() }));
}

function updateDraft(
  state: DraftState,
  ocrJobId: string,
  mutate: (items: DraftProduct[]) => DraftProduct[],
): DraftState["byOcrJob"] {
  const draft = state.byOcrJob[ocrJobId];
  if (!draft) return state.byOcrJob;
  return {
    ...state.byOcrJob,
    [ocrJobId]: {
      ...draft,
      current: mutate(draft.current),
      updatedAt: Date.now(),
    },
  };
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      byOcrJob: {},

      initDraft: (ocrJobId, products) => {
        const existing = get().byOcrJob[ocrJobId];
        if (existing) return existing.current;
        const wrapped = wrap(products);
        set((state) => ({
          byOcrJob: {
            ...state.byOcrJob,
            [ocrJobId]: {
              baseline: wrapped.map((p) => ({ ...p })),
              current: wrapped,
              updatedAt: Date.now(),
            },
          },
        }));
        return wrapped;
      },

      updateProduct: (ocrJobId, localId, patch) =>
        set((state) => ({
          byOcrJob: updateDraft(state, ocrJobId, (items) =>
            items.map((p) => (p.local_id === localId ? { ...p, ...patch } : p)),
          ),
        })),

      toggleSkip: (ocrJobId, localId) =>
        set((state) => ({
          byOcrJob: updateDraft(state, ocrJobId, (items) =>
            items.map((p) =>
              p.local_id === localId ? { ...p, skipped: !p.skipped } : p,
            ),
          ),
        })),

      duplicateProduct: (ocrJobId, localId) =>
        set((state) => ({
          byOcrJob: updateDraft(state, ocrJobId, (items) => {
            const idx = items.findIndex((p) => p.local_id === localId);
            if (idx < 0) return items;
            const source = items[idx];
            const clone: DraftProduct = { ...source, local_id: makeId(), skipped: false };
            return [...items.slice(0, idx + 1), clone, ...items.slice(idx + 1)];
          }),
        })),

      removeProduct: (ocrJobId, localId) =>
        set((state) => ({
          byOcrJob: updateDraft(state, ocrJobId, (items) =>
            items.filter((p) => p.local_id !== localId),
          ),
        })),

      applyCountryBulk: (ocrJobId, country) =>
        set((state) => ({
          byOcrJob: updateDraft(state, ocrJobId, (items) =>
            items.map((p) =>
              p.skipped ? p : { ...p, country_of_origin: country || null },
            ),
          ),
        })),

      resetDraft: (ocrJobId) =>
        set((state) => {
          const draft = state.byOcrJob[ocrJobId];
          if (!draft) return state;
          return {
            byOcrJob: {
              ...state.byOcrJob,
              [ocrJobId]: {
                ...draft,
                current: draft.baseline.map((p) => ({ ...p })),
                updatedAt: Date.now(),
              },
            },
          };
        }),

      clearDraft: (ocrJobId) =>
        set((state) => {
          if (!state.byOcrJob[ocrJobId]) return state;
          const next = { ...state.byOcrJob };
          delete next[ocrJobId];
          return { byOcrJob: next };
        }),
    }),
    {
      name: "feap-extract-drafts",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

export function computeDraftDiff(draft: OcrDraft | undefined) {
  if (!draft) return { changed: 0, removed: 0, added: 0, skipped: 0 };
  const baselineById = new Map(draft.baseline.map((p) => [p.local_id, p]));
  const currentIds = new Set(draft.current.map((p) => p.local_id));

  let changed = 0;
  let added = 0;
  let skipped = 0;

  for (const cur of draft.current) {
    if (cur.skipped) skipped += 1;
    const base = baselineById.get(cur.local_id);
    if (!base) {
      added += 1;
      continue;
    }
    if (
      base.normalized_description !== cur.normalized_description ||
      base.material !== cur.material ||
      base.quantity !== cur.quantity ||
      base.unit !== cur.unit ||
      base.country_of_origin !== cur.country_of_origin ||
      base.hs_code_hint !== cur.hs_code_hint ||
      Boolean(base.skipped) !== Boolean(cur.skipped)
    ) {
      changed += 1;
    }
  }

  const removed = draft.baseline.filter((p) => !currentIds.has(p.local_id)).length;
  return { changed, removed, added, skipped };
}
