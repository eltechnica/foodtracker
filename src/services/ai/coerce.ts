/**
 * Coerce untrusted model JSON into a well-formed MealVisionResult. Models
 * occasionally omit fields, return strings for numbers, or hallucinate extra
 * keys — this normalises all of that so downstream math never sees NaN.
 */

import { Macros } from '../../domain/types';
import { DetectedFood, MealVisionResult } from './types';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function optNum(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : undefined;
}

function macros(v: any): Macros | undefined {
  if (!v || typeof v !== 'object') return undefined;
  return {
    protein: num(v.protein),
    carbs: num(v.carbs),
    fat: num(v.fat),
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function coerceVisionResult(raw: unknown, provider: string): MealVisionResult {
  const obj = (raw ?? {}) as any;
  const foodsRaw = Array.isArray(obj.foods) ? obj.foods : [];
  const foods: DetectedFood[] = foodsRaw.map((f: any) => ({
    name: typeof f?.name === 'string' && f.name.trim() ? f.name.trim() : 'unknown food',
    areaPixels: Math.max(0, num(f?.areaPixels)),
    depthCm: optNum(f?.depthCm),
    confidence: clamp01(num(f?.confidence, 0.5)),
    macrosPer100g: macros(f?.macrosPer100g),
    caloriesPer100g: optNum(f?.caloriesPer100g),
  }));

  const handPixelLength = optNum(obj.handPixelLength);
  return {
    provider,
    handPixelLength: handPixelLength && handPixelLength > 0 ? handPixelLength : null,
    foods,
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
  };
}
