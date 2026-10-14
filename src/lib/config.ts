export interface RuntimeConfig {
  apiBaseUrl: string;
  sseEnabled: boolean;
  ocrMaxFileMb: number;
  batchSyncMax: number;
  defaultLocale: "ru" | "ky";
  buildVersion: string;
  /** /calc without login: calculations per day (0 = unlimited). */
  calcAnonDailyLimit: number;
}

const FALLBACK: RuntimeConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  sseEnabled: (import.meta.env.VITE_SSE_ENABLED ?? "true") !== "false",
  ocrMaxFileMb: Number(import.meta.env.VITE_OCR_MAX_FILE_MB ?? 25),
  batchSyncMax: Number(import.meta.env.VITE_BATCH_SYNC_MAX ?? 5),
  defaultLocale: (import.meta.env.VITE_DEFAULT_LOCALE as "ru" | "ky") ?? "ru",
  buildVersion: import.meta.env.VITE_BUILD_VERSION ?? "dev",
  calcAnonDailyLimit: Number(import.meta.env.VITE_CALC_ANON_DAILY_LIMIT ?? 3),
};

let cached: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (cached) return cached;
  try {
    const res = await fetch("/config.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`config.json status ${res.status}`);
    const raw = (await res.json()) as Partial<RuntimeConfig>;
    cached = { ...FALLBACK, ...raw };
  } catch {
    cached = FALLBACK;
  }
  return cached;
}

export function getConfig(): RuntimeConfig {
  return cached ?? FALLBACK;
}
