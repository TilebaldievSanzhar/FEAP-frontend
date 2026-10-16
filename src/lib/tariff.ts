/**
 * Display helpers for v3 tariff measures (меры защиты рынка, ЗСТ, условный НДС).
 * Nothing here computes payments — amounts come from the backend draft; the
 * only arithmetic is the exact sum of already-computed payment strings.
 */
import type { TradeRemedy, TradeRemedyRate } from "@/api/types";

// ── Countries ───────────────────────────────────────────────────────────────

/** Short forms used across customs paperwork; everything else via Intl. */
const COUNTRY_SHORT_RU: Record<string, string> = {
  CN: "КНР",
  AE: "ОАЭ",
  US: "США",
  GB: "Великобритания",
  KR: "Респ. Корея",
  KP: "КНДР",
  EU: "ЕС",
  ALL: "все страны",
};

const displayNames = new Map<string, Intl.DisplayNames | null>();

function regionNames(locale: string): Intl.DisplayNames | null {
  if (!displayNames.has(locale)) {
    try {
      displayNames.set(locale, new Intl.DisplayNames([locale], { type: "region" }));
    } catch {
      displayNames.set(locale, null);
    }
  }
  return displayNames.get(locale) ?? null;
}

export function countryName(code: string | null | undefined, locale = "ru"): string {
  if (!code) return "";
  const c = code.toUpperCase();
  if (locale === "ru" && COUNTRY_SHORT_RU[c]) return COUNTRY_SHORT_RU[c];
  if (!/^[A-Z]{2}$/.test(c)) return c;
  try {
    return regionNames(locale)?.of(c) ?? c;
  } catch {
    return c;
  }
}

/** Countries offered first in origin selects (most frequent KG import origins). */
export const COMMON_ORIGINS = [
  "CN", "TR", "RU", "KZ", "UZ", "AE", "DE", "US", "KR", "JP", "IN", "IR", "VN", "IT", "PL",
  "BY", "UA", "GB", "FR", "ID", "TH", "MY", "SG", "RS", "AM",
];

/** ISO 3166-1 alpha-2 — the rest of the origin select (remedies hit AZ, GE…). */
const ISO_ALPHA2 = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ " +
  "BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM " +
  "DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS " +
  "GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN " +
  "KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ " +
  "MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM " +
  "PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV " +
  "SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI " +
  "VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

/** Common origins first, then every other country by localized name. */
export function originOptions(locale = "ru"): string[] {
  const rest = ISO_ALPHA2.filter((c) => !COMMON_ORIGINS.includes(c)).sort((a, b) =>
    countryName(a, locale).localeCompare(countryName(b, locale), locale),
  );
  return [...COMMON_ORIGINS, ...rest];
}

/** Members of the EAEU — no import declaration between them (backend rule I-EAEU). */
export const EAEU_MEMBERS: readonly string[] = ["AM", "BY", "KZ", "KG", "RU"];

/** EU member states — for measures whose country is «EU» (mirrors backend EU_MEMBERS). */
const EU_MEMBERS = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

// ── Numbers & dates ─────────────────────────────────────────────────────────

/** "21.89" → "21,89%" (ru decimal comma, as in the EEC register). */
export function formatPct(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "—";
  const s = raw.trim().replace(/%$/, "").replace(".", ",");
  return `${s}%`;
}

/**
 * "1321240.65" → "1 321 240,65" (NBSP groups, comma decimal). Pure string
 * work — money from the backend is never parsed into a float.
 */
export function formatMoney(raw: string | null | undefined, fractionDigits = 2): string {
  if (raw == null || raw === "") return "—";
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(raw.trim());
  if (!m) return raw;
  const int = m[2].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const frac = (m[3] ?? "").padEnd(fractionDigits, "0").slice(0, fractionDigits);
  return `${m[1]}${int}${fractionDigits ? `,${frac}` : ""}`;
}

/** "87.450000" → "87,45"; trims trailing zeros of a decimal string. */
export function formatDecimal(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "—";
  const m = /^(-?\d+)(?:\.(\d*?)0*)?$/.exec(raw.trim());
  if (!m) return raw;
  return m[2] ? `${m[1]},${m[2]}` : m[1];
}

/** Incoterms where freight to the EAEU border is not in the price (backend W-FREIGHT). */
export const FREIGHT_EXPECTED = ["EXW", "FCA", "FAS", "FOB"];

/**
 * Short product title from a long description: the first sentence, cut at a
 * word boundary (PDF header, page subtitle). The full text travels separately.
 */
export function productTitle(description: string | null | undefined, max = 120): string | null {
  const text = (description ?? "").trim();
  if (!text) return null;
  const sentence = text.split(/(?<=[.!?])\s/)[0];
  if (sentence.length <= max) return sentence.replace(/[.!?]$/, "");
  const cut = sentence.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2)).trimEnd()}…`;
}

/** "2027-05-28" → "28.05.2027"; anything else is returned unchanged. */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Exact sum of decimal money strings (backend Decimal → "78750.00").
 * BigInt on hundredths, so no float drift; null/garbage entries are skipped.
 */
export function sumMoney(values: Array<string | null | undefined>): string {
  let cents = 0n;
  for (const v of values) {
    if (v == null) continue;
    const m = /^(-?)(\d+)(?:\.(\d{1,2})\d*)?$/.exec(v.trim());
    if (!m) continue;
    const abs = BigInt(m[2]) * 100n + BigInt((m[3] ?? "").padEnd(2, "0") || "0");
    cents += m[1] ? -abs : abs;
  }
  const neg = cents < 0n;
  const a = neg ? -cents : cents;
  return `${neg ? "-" : ""}${a / 100n}.${String(a % 100n).padStart(2, "0")}`;
}

// ── Customs fee ─────────────────────────────────────────────────────────────

/** «0.4% от … сом — ПП КР № 79 …» → value / note / legal. */
export function splitFeeRule(rule: string): { value: string; note: string | null; legal: string | null } {
  const [head, ...tail] = rule.split(" — ");
  const m = /^\s*([\d.,]+\s*%)\s*(.*)$/.exec(head);
  return {
    value: m ? m[1].replace(".", ",").replace(/\s+/g, "") : head,
    note: m ? m[2] || null : null,
    legal: tail.length ? tail.join(" — ") : null,
  };
}

// ── Trade remedies ──────────────────────────────────────────────────────────

type WithRates = Pick<TradeRemedy, "rates">;

/** A rate row applies to the origin: no country, the country itself, or «EU» for EU states. */
function rateFitsOrigin(r: TradeRemedyRate, origin: string): boolean {
  return r.country == null || r.country === origin || (r.country === "EU" && EU_MEMBERS.has(origin));
}

/** Rates that can apply for the origin (no origin → all rates, for display). */
export function ratesForOrigin(m: WithRates, origin?: string | null): TradeRemedyRate[] {
  if (!origin) return m.rates;
  const o = origin.toUpperCase();
  return m.rates.filter((r) => rateFitsOrigin(r, o));
}

/** Single rate or a min–max range: "21,89%" / "11,31–34,31%". */
export function remedyRateSummary(m: WithRates, origin?: string | null): string {
  const rates = ratesForOrigin(m, origin);
  const nums = rates.map((r) => Number(r.rate_pct)).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return "—";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const fmt = (n: number) => String(n).replace(".", ",");
  return min === max ? `${fmt(min)}%` : `${fmt(min)}–${fmt(max)}%`;
}

export function remedyProducers(m: WithRates, origin?: string | null): string[] {
  const out: string[] = [];
  for (const r of ratesForOrigin(m, origin)) for (const p of r.producers) if (!out.includes(p)) out.push(p);
  return out;
}

export function remedyVariants(m: WithRates, origin?: string | null): string[] {
  const out: string[] = [];
  for (const r of ratesForOrigin(m, origin)) if (r.variant && !out.includes(r.variant)) out.push(r.variant);
  return out;
}

/** Legal-form tokens ignored when comparing names (same set as backend _LEGAL_TOKENS). */
const LEGAL_TOKENS = new Set([
  "co", "ltd", "limited", "inc", "llc", "jsc", "plc", "gmbh", "sa", "corp",
  "company", "ооо", "оао", "зао", "чао", "ао", "тоо", "пао", "ип", "осоо", "as", "aş",
]);

function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'`.,()[\]/\\:;*&+-]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !LEGAL_TOKENS.has(t))
    .join(" ");
}

/** Loose producer match — same rule as backend producer_matches(); display only. */
export function producerMatches(manufacturer: string | null | undefined, producer: string): boolean {
  if (!manufacturer) return false;
  const a = normalizeCompany(manufacturer);
  const b = normalizeCompany(producer);
  if (!a || !b) return false;
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 8 && (a.includes(b) || b.includes(a));
}

/**
 * The rate row the draft will take — for «→ 11,31%» next to the producer
 * select. Mirrors backend select_rate(): unknown variant or an unmatched
 * producer under a measure with only individual rates → null (the draft asks).
 */
export function previewRemedyRate(
  m: WithRates,
  opts: { origin?: string | null; manufacturer?: string | null; variant?: string | null },
): TradeRemedyRate | null {
  const origin = (opts.origin ?? "").toUpperCase();
  let rows = m.rates.filter((r) => (origin ? rateFitsOrigin(r, origin) : r.country == null));
  if (rows.some((r) => r.variant)) {
    const wanted = opts.variant?.trim().toLowerCase();
    if (!wanted) return null;
    rows = rows.filter((r) => r.variant && r.variant.toLowerCase().startsWith(wanted));
  }
  if (opts.manufacturer) {
    const named = rows.find((r) => r.producers.some((p) => producerMatches(opts.manufacturer, p)));
    if (named) return named;
  }
  const others = rows.filter((r) => r.producers.length === 0);
  if (!others.length) return null;
  return others.reduce((a, b) => (Number(b.rate_pct) > Number(a.rate_pct) ? b : a));
}

/**
 * «Товар 1 (7615101000): антидемпинговая мера AD-32 … (remedy_decisions['AD-32']: …)»
 * → { position: 1, measureNo: "AD-32" } — for the «Решить» jump from the draft.
 */
export function parseRemedyMissing(
  line: string,
): { position: number; measureNo: string; kind: "decision" | "rate" } | null {
  const pos = /^Товар (\d+)\b/.exec(line);
  const measure = /remedy_decisions\['([^']+)'\](\.rate_pct)?/.exec(line);
  if (!pos || !measure) return null;
  // «.rate_pct» — ставки меры не проверены по тексту решения: нужна ставка вручную.
  return { position: Number(pos[1]), measureNo: measure[1], kind: measure[2] ? "rate" : "decision" };
}

// ── Nomenclature chain ──────────────────────────────────────────────────────

const SECTIONS: Array<[number, string]> = [
  [5, "I"], [14, "II"], [15, "III"], [24, "IV"], [27, "V"], [38, "VI"], [40, "VII"],
  [43, "VIII"], [46, "IX"], [49, "X"], [63, "XI"], [67, "XII"], [70, "XIII"], [71, "XIV"],
  [83, "XV"], [85, "XVI"], [89, "XVII"], [92, "XVIII"], [93, "XIX"], [96, "XX"], [97, "XXI"],
];

/** Раздел ТН ВЭД (римская цифра) по группе кода. */
export function hsSection(code: string): string | null {
  const group = Number(code.slice(0, 2));
  if (!Number.isFinite(group) || group < 1) return null;
  return SECTIONS.find(([last]) => group <= last)?.[1] ?? null;
}
