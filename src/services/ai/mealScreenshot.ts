/**
 * Meal-from-screenshot vision: read a screenshot that shows either a
 * macros/nutrition summary (calories + protein/carbs/fat, e.g. from another
 * tracking app or a nutrition label) OR a plain food/ingredient list, and turn
 * it into logged food items. Used by the quick-add "screenshot" flow.
 */

import { FoodItem, Macros } from '../../domain/types';
import { caloriesFromMacros } from '../../domain/nutrition';

export interface NutritionVisionRequest {
  imageBase64: string;
  mimeType: string;
  hint?: string;
}

export interface NutritionResult {
  items: FoodItem[];
  provider: string;
  notes?: string;
}

export const NUTRITION_JSON_INSTRUCTIONS = `You read food/nutrition information from a screenshot. The image may show a macros summary (calories, protein, carbs, fat) from a tracking app, a nutrition label, or a list of foods/ingredients. Respond with STRICT JSON only (no markdown, no prose):

{
  "items": [
    { "name": string, "calories": number, "macros": { "protein": number, "carbs": number, "fat": number } }
  ],
  "notes": string
}

If only overall totals are shown, return a single item named after the meal. Grams are optional. Return ONLY the JSON object.`;

export function buildNutritionUserText(hint?: string): string {
  const base = 'Extract the foods with their calories and macros (grams) from this screenshot.';
  return hint ? `${base} Context: ${hint}` : base;
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? Number(String(v).replace(/[^0-9.\-]/g, '')) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function macros(v: any): Macros {
  return { protein: num(v?.protein), carbs: num(v?.carbs), fat: num(v?.fat) };
}

/** Normalise untrusted model JSON into logged FoodItems. */
export function coerceNutrition(raw: unknown, provider: string): NutritionResult {
  const obj = (raw ?? {}) as any;
  const arr = Array.isArray(obj.items) ? obj.items : [];
  const items: FoodItem[] = arr
    .map((it: any) => {
      const m = macros(it?.macros);
      const calories = num(it?.calories) || Math.round(caloriesFromMacros(m));
      return {
        name: typeof it?.name === 'string' && it.name.trim() ? it.name.trim() : 'food',
        grams: num(it?.grams),
        calories,
        macros: m,
      };
    })
    .filter((it: FoodItem) => it.calories > 0 || it.macros.protein + it.macros.carbs + it.macros.fat > 0);
  return {
    items,
    provider,
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
  };
}
