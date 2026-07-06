/**
 * FitMenCook ingestion helpers.
 *
 * FitMenCook has no public API, so we support three realistic ingestion paths:
 *  1. Paste a recipe's ingredient list (from the website or app).
 *  2. Paste a YouTube auto-transcript; we heuristically pull out ingredient
 *     lines and quantities.
 *  3. Manual entry.
 *
 * This module handles parsing ingredient text into structured, quantity-aware
 * ingredients and normalising common units to grams where we can.
 */

import { Macros, Recipe, RecipeIngredient } from './types';
import { caloriesFromMacros } from './nutrition';

/** Approximate grams for common volume/count units (very rough priors). */
const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  cup: 240, // water-equivalent; foods vary
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  ml: 1,
};

const UNIT_ALIASES: Record<string, string> = {
  tablespoons: 'tbsp',
  tablespoon: 'tbsp',
  teaspoons: 'tsp',
  teaspoon: 'tsp',
  ounces: 'oz',
  ounce: 'oz',
  grams: 'g',
  gram: 'g',
  cups: 'cup',
  lbs: 'lb',
};

/** Parse a leading quantity that may be a fraction, mixed number, or decimal. */
export function parseQuantity(token: string): number | undefined {
  const t = token.trim();
  // Unicode fraction glyphs
  const glyphs: Record<string, number> = {
    '½': 0.5,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '¼': 0.25,
    '¾': 0.75,
    '⅛': 0.125,
  };
  if (glyphs[t] !== undefined) return glyphs[t];
  // Mixed number like "1 1/2"
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  // Simple fraction "1/2"
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  // Decimal / integer
  const num = Number(t);
  return Number.isFinite(num) ? num : undefined;
}

/**
 * Parse a single ingredient line into a structured ingredient.
 * e.g. "2 cups cooked brown rice" -> {quantity:2, unit:"cup", name:"cooked brown rice", grams:480}
 */
export function parseIngredientLine(raw: string): RecipeIngredient {
  const cleaned = raw.replace(/^[-*•\s]+/, '').trim();
  const tokens = cleaned.split(/\s+/);
  let idx = 0;
  let quantity: number | undefined;

  // Quantity may be a mixed number "1 1/2" — try two tokens then one.
  if (tokens.length >= 2) {
    const two = parseQuantity(`${tokens[0]} ${tokens[1]}`);
    if (two !== undefined && /\//.test(`${tokens[0]} ${tokens[1]}`)) {
      quantity = two;
      idx = 2;
    }
  }
  if (quantity === undefined) {
    const one = parseQuantity(tokens[0] ?? '');
    if (one !== undefined) {
      quantity = one;
      idx = 1;
    }
  }

  let unit: string | undefined;
  const maybeUnit = (tokens[idx] ?? '').toLowerCase().replace(/\.$/, '');
  if (maybeUnit in UNIT_TO_GRAMS || maybeUnit in UNIT_ALIASES) {
    unit = UNIT_ALIASES[maybeUnit] ?? maybeUnit;
    idx += 1;
  }

  const name = tokens.slice(idx).join(' ').trim();
  let grams: number | undefined;
  if (quantity !== undefined && unit && UNIT_TO_GRAMS[unit] !== undefined) {
    grams = Math.round(quantity * UNIT_TO_GRAMS[unit]);
  }

  return { raw, name: name || cleaned, quantity, unit, grams };
}

/**
 * Heuristically extract ingredient lines from a pasted YouTube transcript or
 * recipe blob. Returns lines that start with a quantity or a bullet, which is
 * where ingredient lists usually live.
 */
export function extractIngredientLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => {
      if (/^[-*•]/.test(l)) return true;
      const first = l.split(/\s+/)[0];
      return parseQuantity(first) !== undefined;
    });
}

/** Build structured ingredients from a transcript/recipe blob. */
export function ingredientsFromText(text: string): RecipeIngredient[] {
  return extractIngredientLines(text).map(parseIngredientLine);
}

/** Compute per-serving nutrition from whole-recipe totals. */
export function perServing(
  totalCalories: number,
  totalMacros: Macros,
  servings: number,
): Recipe['perServing'] {
  const s = Math.max(1, servings);
  return {
    calories: Math.round(totalCalories / s),
    macros: {
      protein: round1(totalMacros.protein / s),
      carbs: round1(totalMacros.carbs / s),
      fat: round1(totalMacros.fat / s),
    },
  };
}

/**
 * Scale a recipe's per-serving nutrition to a number of servings actually
 * eaten, returning the calories and macros consumed.
 */
export function nutritionForServings(
  recipe: Recipe,
  servingsEaten: number,
): { calories: number; macros: Macros } {
  return {
    calories: Math.round(recipe.perServing.calories * servingsEaten),
    macros: {
      protein: round1(recipe.perServing.macros.protein * servingsEaten),
      carbs: round1(recipe.perServing.macros.carbs * servingsEaten),
      fat: round1(recipe.perServing.macros.fat * servingsEaten),
    },
  };
}

/** If a recipe lacks a calorie figure, derive it from its macros. */
export function ensureCalories(perServingMacros: Macros, given?: number): number {
  if (given && given > 0) return given;
  return Math.round(caloriesFromMacros(perServingMacros));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
