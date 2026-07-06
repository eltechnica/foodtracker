/**
 * Parser for Apple Health's "Export All Health Data" file (export.xml).
 *
 * This is the zero-native fallback: any user can generate this file from the
 * Health app (Profile ▸ Export All Health Data) and import it here — no
 * HealthKit entitlement, no dev build, works even on Android/web. We only need
 * body-mass records, so we scan for those rather than parsing the whole (often
 * huge) document into a DOM.
 */

import { WeightEntry, WeightSource } from '../../domain/types';

const LB_TO_KG = 0.453592;
const STONE_TO_KG = 6.35029;

function toKg(value: number, unit: string): number {
  const u = unit.toLowerCase().trim();
  if (u === 'kg') return value;
  if (u === 'lb' || u === 'lbs') return value * LB_TO_KG;
  if (u === 'st') return value * STONE_TO_KG;
  if (u === 'g') return value / 1000;
  return value; // assume kg if unknown
}

function classifySource(sourceName: string): WeightSource {
  if (/renpho/i.test(sourceName)) return 'renpho';
  return 'apple-health';
}

/** Apple Health export dates look like "2026-07-01 08:15:03 +0000". */
function toISO(appleDate: string): string {
  // Turn "YYYY-MM-DD HH:MM:SS +ZZZZ" into an ISO-8601 string.
  const m = appleDate.match(
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{2})(\d{2})/,
  );
  if (!m) return appleDate;
  const [, y, mo, d, h, mi, s, zh, zm] = m;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}${zh}:${zm}`;
}

/**
 * Extract body-mass weight entries from an Apple Health export.xml string.
 * Robust to attribute ordering and self-closing vs. wrapped Record elements.
 */
export function parseHealthExport(xml: string): WeightEntry[] {
  const entries: WeightEntry[] = [];
  // Match each <Record ...> whose type is BodyMass.
  const recordRe = /<Record\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = recordRe.exec(xml)) !== null) {
    const attrs = match[1];
    const type = attr(attrs, 'type');
    if (type !== 'HKQuantityTypeIdentifierBodyMass') continue;

    const rawValue = Number(attr(attrs, 'value'));
    if (!Number.isFinite(rawValue)) continue;
    const unit = attr(attrs, 'unit') || 'kg';
    const startDate = attr(attrs, 'startDate');
    const sourceName = attr(attrs, 'sourceName') || 'apple-health';

    entries.push({
      id: `export-${startDate}-${i++}`,
      at: toISO(startDate),
      kg: round1(toKg(rawValue, unit)),
      source: classifySource(sourceName),
    });
  }
  return entries;
}

function attr(attrs: string, name: string): string {
  const m = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : '';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
