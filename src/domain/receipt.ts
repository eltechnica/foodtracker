/**
 * Pure helpers for classifying scanned receipts. The AI vision layer reads the
 * raw text off a receipt; these functions turn merchant names and line items
 * into a spend category and flag alcohol — with no ML, so they're fully
 * testable and also serve as a fallback when the model doesn't classify.
 */

import { ReceiptLineItem, SpendCategory } from './types';

/** Keywords that hint at each spend category, matched against merchant + items. */
const CATEGORY_HINTS: Record<Exclude<SpendCategory, 'other'>, string[]> = {
  grocery: [
    'grocery', 'market', 'foods', 'supermarket', 'trader joe', 'whole foods',
    'safeway', 'kroger', 'aldi', 'costco', 'walmart', 'wegmans', 'publix',
    'sprouts', 'produce', 'grocer',
  ],
  dining: [
    'restaurant', 'cafe', 'coffee', 'bar & grill', 'grill', 'kitchen', 'pizza',
    'sushi', 'taco', 'diner', 'bistro', 'eatery', 'starbucks', 'mcdonald',
    'chipotle', 'doordash', 'ubereats', 'uber eats', 'grubhub', 'deli', 'bakery',
  ],
  alcohol: [
    'liquor', 'wine', 'winery', 'brewery', 'spirits', 'bottle shop', 'bws',
    'total wine', 'abc store', 'cellars', 'distillery', 'beer',
  ],
};

/** Alcohol product keywords used to detect alcohol among line items. */
const ALCOHOL_ITEM_HINTS = [
  'beer', 'ipa', 'lager', 'ale', 'stout', 'pilsner', 'wine', 'merlot',
  'cabernet', 'chardonnay', 'rosé', 'rose wine', 'prosecco', 'champagne',
  'vodka', 'whiskey', 'whisky', 'bourbon', 'tequila', 'gin', 'rum', 'brandy',
  'cocktail', 'seltzer', 'cider', 'sake', 'margarita',
];

function includesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

/** True if any line item looks like an alcoholic product. */
export function receiptContainsAlcohol(itemNames: string[]): boolean {
  return itemNames.some((name) => includesAny(name, ALCOHOL_ITEM_HINTS));
}

/**
 * Best-effort spend category for a receipt. A dedicated liquor store wins
 * outright; otherwise we weigh merchant hints, then fall back to "other".
 * (A grocery run that happens to include a six-pack still counts as grocery —
 * the alcohol flag is surfaced separately so the user can split it if they
 * want.)
 */
export function classifyReceiptCategory(
  merchant: string | undefined,
  itemNames: string[] = [],
): SpendCategory {
  const merchantText = merchant ?? '';

  if (includesAny(merchantText, CATEGORY_HINTS.alcohol)) return 'alcohol';
  if (includesAny(merchantText, CATEGORY_HINTS.grocery)) return 'grocery';
  if (includesAny(merchantText, CATEGORY_HINTS.dining)) return 'dining';

  // No merchant match — look at the basket. Many food items => grocery.
  const itemsText = itemNames.join(' ');
  if (includesAny(itemsText, CATEGORY_HINTS.grocery)) return 'grocery';
  if (includesAny(itemsText, CATEGORY_HINTS.dining)) return 'dining';
  if (itemNames.length >= 4) return 'grocery';

  return 'other';
}

/** Sum of line-item prices — a cross-check against the printed total. */
export function sumLineItems(items: ReceiptLineItem[]): number {
  return Math.round(items.reduce((a, i) => a + (i.price || 0), 0) * 100) / 100;
}
