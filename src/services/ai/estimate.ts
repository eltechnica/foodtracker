/**
 * Turn a raw vision result into concrete, logged food items.
 *
 * This is where the hand-scale magic comes together: for each detected food we
 * convert its pixel footprint into grams using the hand as a scale reference,
 * then apply the model's per-100g macros/calories to get the final numbers.
 * When the hand is not visible, we still produce an estimate — we just cannot
 * scale by pixels, so we fall back to a nominal footprint.
 */

import { FoodItem, HandReference, Macros } from '../../domain/types';
import { densityForFood, estimatePortion } from '../../domain/handScale';
import { caloriesFromMacros } from '../../domain/nutrition';
import { MealVisionResult } from './types';

/** A footprint (px) assumed when no hand is detected, so we still return grams. */
const FALLBACK_HAND_PIXEL_LENGTH = 300;

export interface MealEstimate {
  items: FoodItem[];
  handDetected: boolean;
  provider: string;
  notes?: string;
  totalCalories: number;
  totalMacros: Macros;
}

export function estimateMealFromVision(
  result: MealVisionResult,
  hand: HandReference,
): MealEstimate {
  const handDetected = result.handPixelLength !== null;
  const handPixelLength = result.handPixelLength ?? FALLBACK_HAND_PIXEL_LENGTH;

  const items: FoodItem[] = result.foods.map((food) => {
    const { grams } = estimatePortion({
      areaPixels: food.areaPixels,
      handPixelLength,
      hand,
      depthCm: food.depthCm ?? 2,
      foodName: food.name,
      densityGPerMl: densityForFood(food.name),
    });

    const per100Macros: Macros = food.macrosPer100g ?? { protein: 0, carbs: 0, fat: 0 };
    const factor = grams / 100;
    const macros: Macros = {
      protein: round1(per100Macros.protein * factor),
      carbs: round1(per100Macros.carbs * factor),
      fat: round1(per100Macros.fat * factor),
    };
    const calories = food.caloriesPer100g
      ? Math.round(food.caloriesPer100g * factor)
      : Math.round(caloriesFromMacros(macros));

    // If the hand wasn't detected, confidence should reflect the weaker scale.
    const confidence = handDetected ? food.confidence : food.confidence * 0.6;

    return {
      name: food.name,
      grams: Math.round(grams),
      calories,
      macros,
      confidence: round2(confidence),
    };
  });

  const totalCalories = items.reduce((a, i) => a + i.calories, 0);
  const totalMacros = items.reduce(
    (a, i) => ({
      protein: round1(a.protein + i.macros.protein),
      carbs: round1(a.carbs + i.macros.carbs),
      fat: round1(a.fat + i.macros.fat),
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  return {
    items,
    handDetected,
    provider: result.provider,
    notes: result.notes,
    totalCalories,
    totalMacros,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
