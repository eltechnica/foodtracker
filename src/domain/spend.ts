/**
 * Spend & alcohol aggregation: grocery, dining, alcohol and other costs, plus
 * alcohol intake tracking (standard drinks and alcohol calories).
 */

import { Drink, Expense, ISODate, SpendCategory } from './types';
import { dateOf } from './nutrition';

export interface SpendSummary {
  total: number;
  byCategory: Record<SpendCategory, number>;
  currency: string;
}

const ZERO_BY_CATEGORY = (): Record<SpendCategory, number> => ({
  grocery: 0,
  dining: 0,
  alcohol: 0,
  other: 0,
});

/**
 * Summarise expenses. Assumes a single currency; the first expense's currency
 * is reported. Mixed-currency handling would need FX rates — out of scope here.
 */
export function summariseSpend(expenses: Expense[]): SpendSummary {
  const byCategory = ZERO_BY_CATEGORY();
  let total = 0;
  let currency = 'USD';
  if (expenses.length > 0) currency = expenses[0].currency;
  for (const e of expenses) {
    byCategory[e.category] += e.amount;
    total += e.amount;
  }
  return { total: round2(total), byCategory: roundAll(byCategory), currency };
}

/** Filter expenses to an inclusive date range (by local date). */
export function expensesInRange(
  expenses: Expense[],
  startDate: ISODate,
  endDate: ISODate,
): Expense[] {
  return expenses.filter((e) => {
    const d = dateOf(e.at);
    return d >= startDate && d <= endDate;
  });
}

/**
 * Cost per home-cooked vs eaten-out. A crude but useful signal: grocery spend
 * fuels home cooking; dining is eating out. Returns the ratio of dining to
 * total food spend (0..1).
 */
export function diningShare(summary: SpendSummary): number {
  const foodTotal = summary.byCategory.grocery + summary.byCategory.dining;
  if (foodTotal === 0) return 0;
  return summary.byCategory.dining / foodTotal;
}

export interface AlcoholSummary {
  standardDrinks: number;
  calories: number;
  drinkCount: number;
}

/** US standard drink = 14g pure ethanol; ethanol is 7 kcal/g. */
export const KCAL_PER_STANDARD_DRINK = 14 * 7; // 98 kcal from alcohol alone

export function summariseAlcohol(drinks: Drink[]): AlcoholSummary {
  let standardDrinks = 0;
  let calories = 0;
  for (const d of drinks) {
    standardDrinks += d.standardDrinks;
    calories += d.calories;
  }
  return {
    standardDrinks: round2(standardDrinks),
    calories: Math.round(calories),
    drinkCount: drinks.length,
  };
}

/**
 * Estimate the calories of an alcoholic drink from ABV and volume, adding any
 * mixer/residual-sugar calories the caller knows about.
 *
 * @param volumeMl total liquid volume
 * @param abvPercent alcohol by volume, e.g. 5 for a 5% beer
 * @param extraCalories non-alcohol calories (sugar, mixers)
 */
export function estimateDrinkCalories(
  volumeMl: number,
  abvPercent: number,
  extraCalories = 0,
): { calories: number; standardDrinks: number } {
  const ethanolMl = volumeMl * (abvPercent / 100);
  const ethanolGrams = ethanolMl * 0.789; // ethanol density
  const alcoholCalories = ethanolGrams * 7;
  const standardDrinks = ethanolGrams / 14;
  return {
    calories: Math.round(alcoholCalories + extraCalories),
    standardDrinks: round2(standardDrinks),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundAll(r: Record<SpendCategory, number>): Record<SpendCategory, number> {
  return {
    grocery: round2(r.grocery),
    dining: round2(r.dining),
    alcohol: round2(r.alcohol),
    other: round2(r.other),
  };
}
