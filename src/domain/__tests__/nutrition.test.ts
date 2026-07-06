import {
  aggregateDailyNutrition,
  caloriesFromMacros,
  dailyTotalsFor,
  dateOf,
  macroCalorieSplit,
  sumItemCalories,
} from '../nutrition';
import { Meal } from '../types';

const meals: Meal[] = [
  {
    id: '1',
    at: '2026-07-06T08:00:00.000Z',
    type: 'breakfast',
    source: 'manual',
    items: [
      { name: 'eggs', grams: 100, calories: 155, macros: { protein: 13, carbs: 1, fat: 11 } },
    ],
  },
  {
    id: '2',
    at: '2026-07-06T13:00:00.000Z',
    type: 'lunch',
    source: 'ai-photo',
    items: [
      { name: 'chicken', grams: 150, calories: 248, macros: { protein: 40, carbs: 0, fat: 6 } },
      { name: 'rice', grams: 150, calories: 168, macros: { protein: 4, carbs: 35, fat: 1 } },
    ],
  },
  {
    id: '3',
    at: '2026-07-05T19:00:00.000Z',
    type: 'dinner',
    source: 'fitmencook',
    items: [
      { name: 'salmon', grams: 170, calories: 350, macros: { protein: 34, carbs: 0, fat: 22 } },
    ],
  },
];

describe('dateOf', () => {
  it('extracts the date portion', () => {
    expect(dateOf('2026-07-06T13:00:00.000Z')).toBe('2026-07-06');
  });
});

describe('caloriesFromMacros', () => {
  it('applies Atwater factors', () => {
    expect(caloriesFromMacros({ protein: 10, carbs: 20, fat: 5 })).toBe(10 * 4 + 20 * 4 + 5 * 9);
  });
});

describe('aggregateDailyNutrition', () => {
  it('rolls meals up per day', () => {
    const byDay = aggregateDailyNutrition(meals);
    const jul6 = byDay.get('2026-07-06')!;
    expect(jul6.mealCount).toBe(2);
    expect(jul6.calories).toBe(155 + 248 + 168);
    expect(jul6.macros.protein).toBe(13 + 40 + 4);
    expect(byDay.get('2026-07-05')!.calories).toBe(350);
  });
});

describe('dailyTotalsFor', () => {
  it('returns zeros for a day with no meals', () => {
    const totals = dailyTotalsFor(meals, '2026-01-01');
    expect(totals.calories).toBe(0);
    expect(totals.mealCount).toBe(0);
  });
});

describe('sumItemCalories', () => {
  it('sums calories across items', () => {
    expect(sumItemCalories(meals[1].items)).toBe(248 + 168);
  });
});

describe('macroCalorieSplit', () => {
  it('returns fractions summing to ~1', () => {
    const split = macroCalorieSplit({ protein: 30, carbs: 40, fat: 10 });
    const total = split.protein + split.carbs + split.fat;
    expect(total).toBeCloseTo(1, 5);
  });
  it('returns zeros when there are no calories', () => {
    expect(macroCalorieSplit({ protein: 0, carbs: 0, fat: 0 })).toEqual({
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});
