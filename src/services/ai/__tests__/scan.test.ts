import { coerceNutrition } from '../mealScreenshot';
import { coerceWeight } from '../weightScan';
import { MockVisionProvider } from '../mockProvider';

describe('coerceNutrition', () => {
  it('normalises items and computes calories from macros when missing', () => {
    const r = coerceNutrition(
      { items: [{ name: ' Chicken bowl ', macros: { protein: '40', carbs: 50, fat: 10 } }] },
      'test',
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0].name).toBe('Chicken bowl');
    expect(r.items[0].calories).toBe(40 * 4 + 50 * 4 + 10 * 9); // 450
  });
  it('drops empty items and handles missing array', () => {
    expect(coerceNutrition({}, 'test').items).toEqual([]);
    const r = coerceNutrition({ items: [{ name: 'x', calories: 0, macros: {} }] }, 'test');
    expect(r.items).toHaveLength(0);
  });
});

describe('coerceWeight', () => {
  it('reads kg and body fat', () => {
    const r = coerceWeight({ kg: 83.24, bodyFatPct: 18.4, date: '2026-07-01' }, 'test');
    expect(r.kg).toBe(83.2);
    expect(r.bodyFatPct).toBe(18.4);
    expect(r.date).toBe('2026-07-01');
  });
  it('converts an obvious pounds value the model left unconverted', () => {
    const r = coerceWeight({ kg: 185 }, 'test'); // 185 "kg" is really lb
    expect(r.kg).toBeCloseTo(83.9, 1);
  });
  it('rejects an implausible body-fat and bad date', () => {
    const r = coerceWeight({ kg: 80, bodyFatPct: 99, date: 'nope' }, 'test');
    expect(r.bodyFatPct).toBeUndefined();
    expect(r.date).toBeUndefined();
  });
});

describe('MockVisionProvider scan methods', () => {
  it('returns nutrition items', async () => {
    const r = await new MockVisionProvider().analyzeNutrition({ imageBase64: 'A', mimeType: 'image/jpeg' });
    expect(r.items[0].calories).toBeGreaterThan(0);
  });
  it('returns a weight', async () => {
    const r = await new MockVisionProvider().analyzeWeight({ imageBase64: 'A', mimeType: 'image/jpeg' });
    expect(r.kg).toBeGreaterThan(0);
  });
});
