/**
 * Weight-from-screenshot vision: read a body weight (and body-fat %) from a
 * photo of a scale display or a screenshot of the Renpho / Apple Health app.
 * This is the simplest way to import a weigh-in — no data export needed.
 */

export interface WeightVisionRequest {
  imageBase64: string;
  mimeType: string;
}

export interface WeightScanResult {
  kg?: number;
  bodyFatPct?: number;
  /** ISO date if visible. */
  date?: string;
  provider: string;
  notes?: string;
}

export const WEIGHT_JSON_INSTRUCTIONS = `You read a body weight from an image — a scale display or a screenshot of a health/scale app (e.g. Renpho, Apple Health). Respond with STRICT JSON only (no markdown, no prose):

{
  "kg": number,          // body weight in kilograms; if the value is shown in lb, convert to kg
  "bodyFatPct": number,  // body-fat percentage if shown, else omit
  "date": string,        // ISO date "YYYY-MM-DD" if a date is shown, else ""
  "notes": string
}

Return ONLY the JSON object.`;

const LB_TO_KG = 0.453592;

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(String(v).replace(/[^0-9.\-]/g, '')) : (v as number);
  return Number.isFinite(n) ? n : undefined;
}

/** Normalise untrusted model JSON into a WeightScanResult. */
export function coerceWeight(raw: unknown, provider: string): WeightScanResult {
  const obj = (raw ?? {}) as any;
  let kg = num(obj.kg);
  // Guard against a model that ignored the lb→kg instruction: >180 "kg" is
  // almost certainly pounds for a person.
  if (kg != null && kg > 180) kg = Math.round(kg * LB_TO_KG * 10) / 10;

  const bodyFatPct = num(obj.bodyFatPct);
  const date =
    typeof obj.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : undefined;

  return {
    kg: kg != null ? Math.round(kg * 10) / 10 : undefined,
    bodyFatPct: bodyFatPct != null && bodyFatPct > 0 && bodyFatPct < 70 ? bodyFatPct : undefined,
    date,
    provider,
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
  };
}
