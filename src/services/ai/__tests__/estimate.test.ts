import { estimateMealFromVision } from '../estimate';
import { coerceVisionResult } from '../coerce';
import { MockVisionProvider } from '../mockProvider';
import { MealVisionResult } from '../types';
import { HandReference } from '../../../domain/types';

const hand: HandReference = {
  handLengthCm: 18.5,
  palmWidthCm: 8.5,
  calibratedAt: '2026-07-06T00:00:00.000Z',
};

describe('coerceVisionResult', () => {
  it('normalises messy model output without producing NaN', () => {
    const messy = {
      handPixelLength: '350',
      foods: [
        { name: '  Rice ', areaPixels: '30000', confidence: 2, macrosPer100g: { protein: '2.6' } },
        { areaPixels: -5 }, // missing name, negative area
      ],
      extra: 'ignored',
    };
    const res = coerceVisionResult(messy, 'test');
    expect(res.handPixelLength).toBe(350);
    expect(res.foods[0].name).toBe('Rice');
    expect(res.foods[0].areaPixels).toBe(30000);
    expect(res.foods[0].confidence).toBe(1); // clamped
    expect(res.foods[1].name).toBe('unknown food');
    expect(res.foods[1].areaPixels).toBe(0); // clamped to >= 0
    res.foods.forEach((f) => expect(Number.isFinite(f.areaPixels)).toBe(true));
  });

  it('treats a non-positive hand length as not detected', () => {
    const res = coerceVisionResult({ handPixelLength: 0, foods: [] }, 'test');
    expect(res.handPixelLength).toBeNull();
  });
});

describe('estimateMealFromVision', () => {
  const baseResult: MealVisionResult = {
    provider: 'test',
    handPixelLength: 370,
    foods: [
      {
        name: 'brown rice',
        areaPixels: 40000,
        depthCm: 2,
        confidence: 0.6,
        macrosPer100g: { protein: 2.6, carbs: 23, fat: 0.9 },
        caloriesPer100g: 112,
      },
    ],
  };

  it('converts pixels to grams and applies per-100g nutrition', () => {
    const est = estimateMealFromVision(baseResult, hand);
    // 150g rice at 112 kcal/100g => ~168 kcal
    expect(est.handDetected).toBe(true);
    expect(est.items[0].grams).toBe(150);
    expect(est.items[0].calories).toBe(168);
    expect(est.items[0].macros.carbs).toBeCloseTo(34.5, 1);
    expect(est.totalCalories).toBe(168);
  });

  it('still estimates when no hand is detected but lowers confidence', () => {
    const noHand: MealVisionResult = { ...baseResult, handPixelLength: null };
    const est = estimateMealFromVision(noHand, hand);
    expect(est.handDetected).toBe(false);
    expect(est.items[0].calories).toBeGreaterThan(0);
    expect(est.items[0].confidence).toBeLessThan(0.6);
  });

  it('derives calories from macros when per-100g calories are absent', () => {
    const noCals: MealVisionResult = {
      ...baseResult,
      foods: [{ ...baseResult.foods[0], caloriesPer100g: undefined }],
    };
    const est = estimateMealFromVision(noCals, hand);
    expect(est.items[0].calories).toBeGreaterThan(0);
  });
});

describe('MockVisionProvider', () => {
  it('produces a usable estimate with no API key', async () => {
    const provider = new MockVisionProvider();
    const result = await provider.analyzeMeal({
      imageBase64: 'AAAA',
      mimeType: 'image/jpeg',
      hand,
    });
    const est = estimateMealFromVision(result, hand);
    expect(est.items.length).toBeGreaterThan(0);
    expect(est.totalCalories).toBeGreaterThan(0);
  });
});
