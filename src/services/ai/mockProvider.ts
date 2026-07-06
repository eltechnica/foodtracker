/**
 * Deterministic mock vision provider. Lets the whole app work end-to-end with
 * no API key — useful for demos, offline use, and tests. It returns a plausible
 * two-item meal sized relative to the calibrated hand.
 */

import { MealVisionRequest, MealVisionResult, VisionProvider } from './types';

export class MockVisionProvider implements VisionProvider {
  readonly name = 'mock';

  async analyzeMeal(req: MealVisionRequest): Promise<MealVisionResult> {
    // Pretend the hand occupies ~30% of a 1080px-wide frame.
    const handPixelLength = 320;
    return {
      provider: this.name,
      handPixelLength,
      notes: 'Mock estimate — connect a real vision provider for live analysis.',
      foods: [
        {
          name: req.hint?.toLowerCase().includes('salad') ? 'mixed salad' : 'grilled chicken',
          areaPixels: 42000,
          depthCm: 2.5,
          confidence: 0.6,
          macrosPer100g: { protein: 27, carbs: 0, fat: 4 },
          caloriesPer100g: 165,
        },
        {
          name: 'brown rice',
          areaPixels: 30000,
          depthCm: 2,
          confidence: 0.55,
          macrosPer100g: { protein: 2.6, carbs: 23, fat: 0.9 },
          caloriesPer100g: 112,
        },
      ],
    };
  }
}
