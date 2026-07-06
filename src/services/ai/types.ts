/**
 * Provider-agnostic vision interface for meal-photo analysis.
 *
 * The concrete provider (Claude, OpenAI, or a local mock) is chosen at runtime
 * so we can defer the API-key decision. Every provider must return the same
 * shape: which foods it sees, their pixel footprint, and — crucially — the
 * pixel length of the user's hand so we can convert pixels to real portions.
 */

import { HandReference, Macros } from '../../domain/types';
import type { ReceiptVisionRequest, ReceiptResult } from './receipt';
import type { IngredientVisionRequest, IngredientResult } from './ingredients';
import type { NutritionVisionRequest, NutritionResult } from './mealScreenshot';
import type { WeightVisionRequest, WeightScanResult } from './weightScan';

export interface MealVisionRequest {
  /** Base64-encoded image bytes (no data: prefix). */
  imageBase64: string;
  /** e.g. "image/jpeg". */
  mimeType: string;
  /** The user's calibrated hand, passed to the model as the scale reference. */
  hand: HandReference;
  /** Optional hint from the user, e.g. "this is a chicken burrito bowl". */
  hint?: string;
}

export interface DetectedFood {
  name: string;
  /** Footprint area of the food on the plate, in pixels. */
  areaPixels: number;
  /** Estimated depth/height of the food in cm (model's best guess). */
  depthCm?: number;
  /** 0..1 confidence. */
  confidence: number;
  /** Macros per 100g if the model can estimate them. */
  macrosPer100g?: Macros;
  /** Calories per 100g if the model can estimate them. */
  caloriesPer100g?: number;
}

export interface MealVisionResult {
  /**
   * Length of the detected hand in pixels, or null if no hand was found (in
   * which case portion sizing falls back to model gram estimates only).
   */
  handPixelLength: number | null;
  foods: DetectedFood[];
  /** Free-text caveats from the model. */
  notes?: string;
  /** Which provider produced this result. */
  provider: string;
}

export interface VisionProvider {
  readonly name: string;
  analyzeMeal(req: MealVisionRequest): Promise<MealVisionResult>;
  analyzeReceipt(req: ReceiptVisionRequest): Promise<ReceiptResult>;
  analyzeIngredients(req: IngredientVisionRequest): Promise<IngredientResult>;
  analyzeNutrition(req: NutritionVisionRequest): Promise<NutritionResult>;
  analyzeWeight(req: WeightVisionRequest): Promise<WeightScanResult>;
}

// Re-exported here so provider implementations import from one place.
export type { ReceiptVisionRequest, ReceiptResult } from './receipt';
export type { IngredientVisionRequest, IngredientResult } from './ingredients';
export type { NutritionVisionRequest, NutritionResult } from './mealScreenshot';
export type { WeightVisionRequest, WeightScanResult } from './weightScan';
