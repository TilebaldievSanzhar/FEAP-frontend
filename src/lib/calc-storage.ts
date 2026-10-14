/**
 * Per-browser conveniences for /calc: recent calculations and the soft daily
 * limit for anonymous users (design §10.3: 3/day, counter shown up front).
 * localStorage only — every access is guarded, the page works without it.
 */
import { todayIso } from "./tariff";

const RECENT_KEY = "feap-calc-recent";
const USAGE_KEY = "feap-calc-anon-usage";
const RECENT_MAX = 5;

export interface RecentCalc {
  code: string;
  origin: string | null;
  description: string | null;
  /** Short flags: remedy numbers, «НДС 0%», … */
  flags: string[];
  at: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode, quota) — nothing to remember
  }
}

export function loadRecentCalcs(): RecentCalc[] {
  const list = read<RecentCalc[]>(RECENT_KEY);
  return Array.isArray(list) ? list.slice(0, RECENT_MAX) : [];
}

export function pushRecentCalc(entry: Omit<RecentCalc, "at">): RecentCalc[] {
  const rest = loadRecentCalcs().filter((r) => !(r.code === entry.code && r.origin === entry.origin));
  const next = [{ ...entry, at: new Date().toISOString() }, ...rest].slice(0, RECENT_MAX);
  write(RECENT_KEY, next);
  return next;
}

export function anonCalcsUsedToday(): number {
  const u = read<{ date: string; count: number }>(USAGE_KEY);
  return u && u.date === todayIso() ? u.count : 0;
}

export function countAnonCalc(): number {
  const next = anonCalcsUsedToday() + 1;
  write(USAGE_KEY, { date: todayIso(), count: next });
  return next;
}
