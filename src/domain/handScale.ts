/**
 * Hand-as-scale-reference portion estimation.
 *
 * The user calibrates their hand once (see {@link HandReference}). Because a
 * hand is a stable, always-available object of known size, it makes an
 * excellent scale reference in meal photos: if the vision model can locate the
 * hand and the food in the same frame, we can convert pixel measurements into
 * real-world centimeters, then into volume and grams.
 *
 * This module is pure math — no ML. The vision provider supplies pixel
 * measurements; these functions turn them into portion estimates.
 */

import { HandReference } from './types';

/** A "reference adult" hand, used to scale dietitian hand-portion rules. */
export const REFERENCE_ADULT_HAND: Pick<
  HandReference,
  'handLengthCm' | 'palmWidthCm' | 'fistVolumeMl'
> = {
  handLengthCm: 18.5,
  palmWidthCm: 8.5,
  fistVolumeMl: 250, // ~1 US cup
};

/**
 * Common cooked-food densities in grams per millilitre. Rough but useful
 * priors when the vision model can name a food but not weigh it.
 */
export const FOOD_DENSITY_G_PER_ML: Record<string, number> = {
  default: 0.9,
  water: 1.0,
  rice: 0.75,
  pasta: 0.7,
  chicken: 1.05,
  beef: 1.05,
  fish: 1.0,
  vegetables: 0.6,
  salad: 0.35,
  potato: 0.9,
  bread: 0.3,
  oil: 0.92,
  cheese: 1.1,
  beans: 0.85,
  fruit: 0.85,
};

/**
 * Centimetres represented by a single pixel, derived from the hand reference.
 *
 * @param handPixelLength length of the detected hand in the photo, in pixels
 * @param hand the user's calibrated hand
 */
export function scaleCmPerPixel(
  handPixelLength: number,
  hand: Pick<HandReference, 'handLengthCm'>,
): number {
  if (handPixelLength <= 0) {
    throw new Error('handPixelLength must be positive');
  }
  if (hand.handLengthCm <= 0) {
    throw new Error('handLengthCm must be positive');
  }
  return hand.handLengthCm / handPixelLength;
}

/** Convert a pixel area into square centimetres given a linear scale. */
export function areaPixelsToCm2(areaPixels: number, cmPerPixel: number): number {
  if (areaPixels < 0) throw new Error('areaPixels must be non-negative');
  // Area scales with the square of the linear scale factor.
  return areaPixels * cmPerPixel * cmPerPixel;
}

/**
 * Estimate a portion's volume from its footprint area on the plate.
 *
 * We model food as a slab of a given depth. Depth is the hardest quantity to
 * recover from a single photo, so callers pass an assumed depth (the vision
 * model can refine this per food, e.g. thin for salad, tall for a burger).
 */
export function estimateVolumeMl(areaCm2: number, depthCm: number): number {
  if (depthCm < 0) throw new Error('depthCm must be non-negative');
  // 1 cm^3 = 1 ml
  return areaCm2 * depthCm;
}

/** Convert a volume in millilitres to grams using a density prior. */
export function volumeToGrams(volumeMl: number, densityGPerMl: number): number {
  if (densityGPerMl <= 0) throw new Error('densityGPerMl must be positive');
  return volumeMl * densityGPerMl;
}

/** Look up a density prior for a food name, falling back to the default. */
export function densityForFood(foodName: string): number {
  const key = foodName.trim().toLowerCase();
  for (const [name, density] of Object.entries(FOOD_DENSITY_G_PER_ML)) {
    if (name !== 'default' && key.includes(name)) return density;
  }
  return FOOD_DENSITY_G_PER_ML.default;
}

export interface PortionEstimateInput {
  /** Food footprint area in the photo, in pixels. */
  areaPixels: number;
  /** Detected hand length in the same photo, in pixels. */
  handPixelLength: number;
  /** The user's calibrated hand. */
  hand: Pick<HandReference, 'handLengthCm'>;
  /** Assumed food depth in cm (default 2cm — a typical plated portion). */
  depthCm?: number;
  /** Density override; if omitted, derived from foodName. */
  densityGPerMl?: number;
  foodName?: string;
}

export interface PortionEstimate {
  cmPerPixel: number;
  areaCm2: number;
  volumeMl: number;
  grams: number;
}

/**
 * Full pipeline: pixels + hand reference -> estimated grams for one food.
 */
export function estimatePortion(input: PortionEstimateInput): PortionEstimate {
  const {
    areaPixels,
    handPixelLength,
    hand,
    depthCm = 2,
    foodName = 'default',
  } = input;
  const density = input.densityGPerMl ?? densityForFood(foodName);

  const cmPerPixel = scaleCmPerPixel(handPixelLength, hand);
  const areaCm2 = areaPixelsToCm2(areaPixels, cmPerPixel);
  const volumeMl = estimateVolumeMl(areaCm2, depthCm);
  const grams = volumeToGrams(volumeMl, density);

  return { cmPerPixel, areaCm2, volumeMl, grams };
}

/**
 * Dietitian hand-portion rules, scaled to the user's actual hand size.
 *
 * These are the classic "eyeball it with your hand" guidelines, but instead of
 * assuming an average hand we scale each portion by how the user's hand
 * compares to a reference adult hand. A larger hand implies larger portions.
 */
export interface HandPortionGuide {
  /** A palm-sized serving of protein, in grams. */
  proteinPalmGrams: number;
  /** A fist-sized serving of carbs/veg, in grams. */
  carbFistGrams: number;
  /** A cupped-hand serving (e.g. nuts, snacks), in grams. */
  cuppedHandGrams: number;
  /** A thumb-sized serving of fats (e.g. oil, nut butter), in grams. */
  thumbFatGrams: number;
}

export function handPortionGuide(hand: HandReference): HandPortionGuide {
  // Volume scales roughly with the cube of a linear dimension.
  const linearRatio = hand.handLengthCm / REFERENCE_ADULT_HAND.handLengthCm;
  const volumeRatio = linearRatio ** 3;

  // Reference gram values for an average adult hand.
  const REF = {
    proteinPalmGrams: 100, // ~3.5oz cooked protein
    carbFistGrams: 150, // ~1 cup cooked carbs
    cuppedHandGrams: 40, // ~1/2 cup / small handful
    thumbFatGrams: 14, // ~1 tbsp
  };

  return {
    proteinPalmGrams: round(REF.proteinPalmGrams * volumeRatio),
    carbFistGrams: round(REF.carbFistGrams * volumeRatio),
    cuppedHandGrams: round(REF.cuppedHandGrams * volumeRatio),
    thumbFatGrams: round(REF.thumbFatGrams * volumeRatio),
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
