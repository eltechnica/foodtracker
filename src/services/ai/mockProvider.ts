/**
 * Deterministic mock vision provider. Lets the whole app work end-to-end with
 * no API key — useful for demos, offline use, and tests. It returns a plausible
 * two-item meal sized relative to the calibrated hand.
 */

import { MealVisionRequest, MealVisionResult, VisionProvider } from './types';
import { ReceiptResult, ReceiptVisionRequest } from './receipt';
import { IngredientResult, IngredientVisionRequest } from './ingredients';
import { NutritionResult, NutritionVisionRequest } from './mealScreenshot';
import { WeightScanResult, WeightVisionRequest } from './weightScan';

export class MockVisionProvider implements VisionProvider {
  readonly name = 'mock';

  async analyzeNutrition(_req: NutritionVisionRequest): Promise<NutritionResult> {
    return {
      provider: this.name,
      items: [
        { name: 'Logged meal', grams: 0, calories: 620, macros: { protein: 42, carbs: 55, fat: 22 } },
      ],
      notes: 'Mock estimate — connect a real vision provider to read your screenshot.',
    };
  }

  async analyzeWeight(_req: WeightVisionRequest): Promise<WeightScanResult> {
    return {
      provider: this.name,
      kg: 83.2,
      bodyFatPct: 18.4,
      notes: 'Mock estimate — connect a real vision provider to read your screenshot.',
    };
  }

  async analyzeIngredients(_req: IngredientVisionRequest): Promise<IngredientResult> {
    return {
      provider: this.name,
      title: 'High-protein burrito bowl',
      ingredients: [
        '2 cups cooked brown rice',
        '6 oz grilled chicken',
        '1/2 avocado',
        '1 cup black beans',
        '1/4 cup salsa',
      ],
      notes: 'Mock estimate — connect a real vision provider to read your photo.',
    };
  }

  async analyzeReceipt(req: ReceiptVisionRequest): Promise<ReceiptResult> {
    const dining = req.hint?.toLowerCase().includes('dinner');
    return dining
      ? {
          provider: this.name,
          merchant: 'The Corner Bistro',
          total: 58.4,
          currency: 'USD',
          category: 'dining',
          containsAlcohol: true,
          lineItems: [
            { name: 'Burger', price: 16 },
            { name: 'Caesar salad', price: 12 },
            { name: 'IPA draft', price: 8 },
            { name: 'Tip', price: 10.4 },
          ],
          notes: 'Mock estimate — connect a real vision provider to read your receipt.',
        }
      : {
          provider: this.name,
          merchant: 'Whole Foods Market',
          total: 42.5,
          currency: 'USD',
          category: 'grocery',
          containsAlcohol: false,
          lineItems: [
            { name: 'Bananas', price: 2.1 },
            { name: 'Chicken breast', price: 11.4 },
            { name: 'Brown rice', price: 4.5 },
            { name: 'Spinach', price: 3.5 },
          ],
          notes: 'Mock estimate — connect a real vision provider to read your receipt.',
        };
  }

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
