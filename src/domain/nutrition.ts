/**
 * Nutrition aggregation: rolling up food items and meals into daily totals.
 */

import { FoodItem, Macros, Meal, ISODate } from './types';

export const EMPTY_MACROS: Macros = { protein: 0, carbs: 0, fat: 0 };

/** Calories per gram of each macronutrient (Atwater factors). */
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9, alcohol: 7 } as const;

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

/** Sum the macros of a list of food items. */
export function sumItemMacros(items: FoodItem[]): Macros {
  return items.reduce((acc, item) => addMacros(acc, item.macros), { ...EMPTY_MACROS });
}

/** Sum calories of a list of food items. */
export function sumItemCalories(items: FoodItem[]): number {
  return items.reduce((acc, item) => acc + item.calories, 0);
}

/**
 * Estimate calories from macros using Atwater factors. Useful to sanity-check
 * or fill in a missing calorie value.
 */
export function caloriesFromMacros(macros: Macros): number {
  return (
    macros.protein * KCAL_PER_G.protein +
    macros.carbs * KCAL_PER_G.carbs +
    macros.fat * KCAL_PER_G.fat
  );
}

export interface DailyNutrition {
  date: ISODate;
  calories: number;
  macros: Macros;
  mealCount: number;
}

/** Extract the local date portion (YYYY-MM-DD) of an ISO datetime. */
export function dateOf(isoDateTime: string): ISODate {
  return isoDateTime.slice(0, 10);
}

/**
 * Aggregate meals into per-day nutrition totals, keyed by date.
 */
export function aggregateDailyNutrition(meals: Meal[]): Map<ISODate, DailyNutrition> {
  const byDate = new Map<ISODate, DailyNutrition>();
  for (const meal of meals) {
    const date = dateOf(meal.at);
    const existing =
      byDate.get(date) ??
      ({ date, calories: 0, macros: { ...EMPTY_MACROS }, mealCount: 0 } as DailyNutrition);
    existing.calories += sumItemCalories(meal.items);
    existing.macros = addMacros(existing.macros, sumItemMacros(meal.items));
    existing.mealCount += 1;
    byDate.set(date, existing);
  }
  return byDate;
}

/** Totals for a single day (0 if no meals that day). */
export function dailyTotalsFor(meals: Meal[], date: ISODate): DailyNutrition {
  return (
    aggregateDailyNutrition(meals).get(date) ?? {
      date,
      calories: 0,
      macros: { ...EMPTY_MACROS },
      mealCount: 0,
    }
  );
}

/**
 * Percentage of calories coming from each macro on a given day.
 * Returns fractions that sum to ~1 (0 if there are no calories).
 */
export function macroCalorieSplit(macros: Macros): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const p = macros.protein * KCAL_PER_G.protein;
  const c = macros.carbs * KCAL_PER_G.carbs;
  const f = macros.fat * KCAL_PER_G.fat;
  const total = p + c + f;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: p / total, carbs: c / total, fat: f / total };
}
