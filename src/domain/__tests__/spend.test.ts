import {
  diningShare,
  estimateDrinkCalories,
  expensesInRange,
  summariseAlcohol,
  summariseSpend,
} from '../spend';
import { Drink, Expense } from '../types';

const expenses: Expense[] = [
  { id: '1', at: '2026-07-01T10:00:00.000Z', amount: 82.5, currency: 'USD', category: 'grocery' },
  { id: '2', at: '2026-07-03T20:00:00.000Z', amount: 45, currency: 'USD', category: 'dining' },
  { id: '3', at: '2026-07-04T21:00:00.000Z', amount: 18, currency: 'USD', category: 'alcohol' },
  { id: '4', at: '2026-07-10T12:00:00.000Z', amount: 30, currency: 'USD', category: 'grocery' },
];

describe('summariseSpend', () => {
  it('totals per category and overall', () => {
    const s = summariseSpend(expenses);
    expect(s.total).toBe(175.5);
    expect(s.byCategory.grocery).toBe(112.5);
    expect(s.byCategory.dining).toBe(45);
    expect(s.byCategory.alcohol).toBe(18);
    expect(s.currency).toBe('USD');
  });

  it('handles an empty list', () => {
    const s = summariseSpend([]);
    expect(s.total).toBe(0);
    expect(s.byCategory.grocery).toBe(0);
  });
});

describe('expensesInRange', () => {
  it('filters inclusively by date', () => {
    const inRange = expensesInRange(expenses, '2026-07-01', '2026-07-04');
    expect(inRange.map((e) => e.id)).toEqual(['1', '2', '3']);
  });
});

describe('diningShare', () => {
  it('computes dining as a share of food spend', () => {
    const s = summariseSpend(expenses);
    // dining 45 / (grocery 112.5 + dining 45) = 45/157.5
    expect(diningShare(s)).toBeCloseTo(45 / 157.5, 5);
  });
  it('is 0 when there is no food spend', () => {
    expect(diningShare(summariseSpend([]))).toBe(0);
  });
});

describe('estimateDrinkCalories', () => {
  it('estimates calories and standard drinks for a 5% beer', () => {
    // 355ml * 5% = 17.75ml ethanol * 0.789 = 14.0g -> ~1 standard drink, ~98 kcal
    const r = estimateDrinkCalories(355, 5);
    expect(r.standardDrinks).toBeCloseTo(1, 1);
    expect(r.calories).toBeGreaterThan(90);
    expect(r.calories).toBeLessThan(110);
  });
  it('adds mixer calories', () => {
    const plain = estimateDrinkCalories(44, 40); // a 40% spirit shot
    const withMixer = estimateDrinkCalories(44, 40, 120);
    expect(withMixer.calories).toBe(plain.calories + 120);
  });
});

describe('summariseAlcohol', () => {
  it('totals standard drinks and calories', () => {
    const drinks: Drink[] = [
      { id: 'a', at: 'x', name: 'beer', standardDrinks: 1, calories: 150 },
      { id: 'b', at: 'y', name: 'wine', standardDrinks: 1.5, calories: 180 },
    ];
    const s = summariseAlcohol(drinks);
    expect(s.standardDrinks).toBe(2.5);
    expect(s.calories).toBe(330);
    expect(s.drinkCount).toBe(2);
  });
});
