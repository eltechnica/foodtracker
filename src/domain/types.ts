/**
 * Core domain types for the Ultimate Health Tracker.
 *
 * These are deliberately plain TypeScript with no React Native / Expo imports
 * so the domain logic stays pure and unit-testable in a Node environment.
 */

export type ISODate = string; // "2026-07-06"
export type ISODateTime = string; // "2026-07-06T12:30:00.000Z"

/** Macronutrients in grams. */
export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

/** A single food item within a meal. */
export interface FoodItem {
  name: string;
  /** Estimated edible quantity in grams. */
  grams: number;
  calories: number;
  macros: Macros;
  /** 0..1 model confidence for AI-estimated items. */
  confidence?: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** How a meal's nutrition data was produced. */
export type MealSource =
  | 'ai-photo' // estimated from a photo by the vision model
  | 'manual' // typed in by the user
  | 'fitmencook' // imported from a FitMenCook recipe
  | 'health-import'; // imported from Apple Health / another app

export interface Meal {
  id: string;
  at: ISODateTime;
  type: MealType;
  source: MealSource;
  items: FoodItem[];
  /** Optional local URI of the meal photo. */
  photoUri?: string;
  notes?: string;
}

/** Calibration of the user's hand, used as a stable scale reference in photos. */
export interface HandReference {
  /** Length from wrist crease to tip of middle finger, in centimeters. */
  handLengthCm: number;
  /** Palm width across the knuckles, in centimeters. */
  palmWidthCm: number;
  /** Optional: fist volume in milliliters (~ one cup for many adults). */
  fistVolumeMl?: number;
  calibratedAt: ISODateTime;
}

export type SpendCategory = 'grocery' | 'dining' | 'alcohol' | 'other';

export interface Expense {
  id: string;
  at: ISODateTime;
  amount: number; // in the user's currency, positive number
  currency: string; // ISO 4217, e.g. "USD"
  category: SpendCategory;
  merchant?: string;
  notes?: string;
  /** Optional link to a meal this spend paid for. */
  mealId?: string;
}

/** A logged alcoholic drink. */
export interface Drink {
  id: string;
  at: ISODateTime;
  name: string;
  /** Standard drinks (US standard = 14g pure alcohol). */
  standardDrinks: number;
  calories: number;
  /** Optional linked expense. */
  expenseId?: string;
}

export type WeightSource = 'manual' | 'apple-health' | 'renpho';

export interface WeightEntry {
  id: string;
  at: ISODateTime;
  kg: number;
  source: WeightSource;
  /** Body-fat percentage if the scale (e.g. Renpho) reports it. */
  bodyFatPct?: number;
}

/** A recipe, e.g. sourced from FitMenCook. */
export interface Recipe {
  id: string;
  title: string;
  source: 'fitmencook' | 'manual' | 'youtube';
  sourceUrl?: string;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  /** Per-serving nutrition. */
  perServing: {
    calories: number;
    macros: Macros;
  };
}

export interface RecipeIngredient {
  raw: string; // original line, e.g. "2 cups cooked brown rice"
  name: string; // "cooked brown rice"
  quantity?: number; // 2
  unit?: string; // "cup"
  grams?: number; // normalized weight if resolvable
}
