import type { ShipmentIn, ShipmentItemIn } from "@/api/dt-types";

const ITEM_NUMBER_KEYS = new Set<keyof ShipmentItemIn>(["packages"]);
const HEADER_NUMBER_KEYS = new Set<keyof ShipmentIn>(["places_total"]);

function coerceItemValue(key: keyof ShipmentItemIn, raw: string | null): unknown {
  if (raw === null || raw === "") return null;
  if (ITEM_NUMBER_KEYS.has(key)) return Number(raw);
  return raw;
}

function coerceHeaderValue(key: keyof ShipmentIn, raw: string | null): unknown {
  if (raw === null || raw === "") return null;
  if (HEADER_NUMBER_KEYS.has(key)) return Number(raw);
  if (key === "container") return raw === "true" || raw === "1";
  return raw;
}

/**
 * Apply a fixer suggestion (`field_path` in backend terms: `freight_to_border`
 * or `items[0].net_kg`, item index is 0-based) to the local shipment model.
 * Throws with a readable message when the path is unknown.
 */
export function applyFieldPatch(
  model: ShipmentIn,
  fieldPath: string,
  rawValue: string | null,
): ShipmentIn {
  const itemMatch = /^items\[(\d+)\]\.([a-z_]+)$/.exec(fieldPath);
  if (itemMatch) {
    const idx = Number(itemMatch[1]);
    const key = itemMatch[2] as keyof ShipmentItemIn;
    if (idx < 0 || idx >= model.items.length) {
      throw new Error(`Позиция ${idx + 1} не найдена в досье`);
    }
    const items = model.items.slice();
    items[idx] = { ...items[idx], [key]: coerceItemValue(key, rawValue) };
    return { ...model, items };
  }

  const partyMatch = /^(seller|buyer|declarant)\.([a-z_]+)$/.exec(fieldPath);
  if (partyMatch) {
    const [, party, key] = partyMatch;
    const current = model[party as "seller" | "buyer" | "declarant"];
    if (!current) throw new Error(`Сторона «${party}» не заполнена в досье`);
    return { ...model, [party]: { ...current, [key]: rawValue } };
  }

  if (/^[a-z_]+$/.test(fieldPath) && fieldPath in model) {
    const key = fieldPath as keyof ShipmentIn;
    return { ...model, [key]: coerceHeaderValue(key, rawValue) } as ShipmentIn;
  }

  throw new Error(`Неизвестное поле «${fieldPath}»`);
}
