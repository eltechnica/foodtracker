/**
 * Receipt vision: read a photographed physical receipt OR a screenshot of an
 * online/email receipt and extract structured expense data. Shares the same
 * provider-agnostic design as the meal analyzer.
 */

import { ReceiptLineItem, SpendCategory } from '../../domain/types';
import { classifyReceiptCategory, receiptContainsAlcohol, sumLineItems } from '../../domain/receipt';

export interface ReceiptVisionRequest {
  imageBase64: string;
  mimeType: string;
  /** Optional user hint, e.g. "grocery run" or "dinner with friends". */
  hint?: string;
}

export interface ReceiptResult {
  merchant?: string;
  total?: number;
  currency: string;
  /** ISO date (YYYY-MM-DD) if printed on the receipt. */
  date?: string;
  category: SpendCategory;
  containsAlcohol: boolean;
  lineItems: ReceiptLineItem[];
  provider: string;
  notes?: string;
}

export const RECEIPT_JSON_INSTRUCTIONS = `You are a receipt-reading assistant. The image is either a photo of a paper receipt or a screenshot of an online/email receipt. Extract the details and respond with STRICT JSON only (no markdown, no prose) matching this TypeScript type:

{
  "merchant": string,            // store/restaurant name
  "total": number,               // grand total actually paid
  "currency": string,            // ISO 4217, e.g. "USD"; default "USD" if unclear
  "date": string,                // ISO date "YYYY-MM-DD" if visible, else ""
  "category": "grocery" | "dining" | "alcohol" | "other",
  "containsAlcohol": boolean,    // true if any alcoholic item is listed
  "lineItems": [ { "name": string, "price": number } ],
  "notes": string                // brief caveats, e.g. blurry total
}

Classify "category" by the overall purchase: a supermarket is "grocery", a restaurant/cafe/food-delivery is "dining", a liquor/wine/beer store is "alcohol". Return ONLY the JSON object.`;

export function buildReceiptUserText(hint?: string): string {
  const base =
    'Read this receipt. Prefer the printed grand total (after tax and tip) for "total". List the purchased items in lineItems.';
  return hint ? `${base} Context from the user: ${hint}` : base;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(String(v).replace(/[^0-9.\-]/g, '')) : (v as number);
  return Number.isFinite(n) ? n : undefined;
}

/** Normalise untrusted model JSON into a well-formed ReceiptResult. */
export function coerceReceipt(raw: unknown, provider: string): ReceiptResult {
  const obj = (raw ?? {}) as any;

  const lineItems: ReceiptLineItem[] = Array.isArray(obj.lineItems)
    ? obj.lineItems
        .map((it: any) => ({
          name: typeof it?.name === 'string' ? it.name.trim() : '',
          price: num(it?.price) ?? 0,
        }))
        .filter((it: ReceiptLineItem) => it.name.length > 0)
    : [];

  const merchant =
    typeof obj.merchant === 'string' && obj.merchant.trim() ? obj.merchant.trim() : undefined;
  const itemNames = lineItems.map((i) => i.name);

  // Prefer the model's total; fall back to the summed line items.
  const total = num(obj.total) ?? (lineItems.length ? sumLineItems(lineItems) : undefined);

  const currency =
    typeof obj.currency === 'string' && obj.currency.trim() ? obj.currency.trim().toUpperCase() : 'USD';

  const date =
    typeof obj.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : undefined;

  // Trust the model's category when valid; otherwise classify from text.
  const validCats: SpendCategory[] = ['grocery', 'dining', 'alcohol', 'other'];
  const category: SpendCategory = validCats.includes(obj.category)
    ? obj.category
    : classifyReceiptCategory(merchant, itemNames);

  const containsAlcohol =
    typeof obj.containsAlcohol === 'boolean'
      ? obj.containsAlcohol
      : receiptContainsAlcohol(itemNames);

  return {
    merchant,
    total,
    currency,
    date,
    category,
    containsAlcohol,
    lineItems,
    provider,
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
  };
}
