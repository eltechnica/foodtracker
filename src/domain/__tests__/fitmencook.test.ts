import {
  extractIngredientLines,
  ingredientsFromText,
  nutritionForServings,
  parseIngredientLine,
  parseQuantity,
  perServing,
} from '../fitmencook';
import { Recipe } from '../types';

describe('parseQuantity', () => {
  it('parses integers and decimals', () => {
    expect(parseQuantity('2')).toBe(2);
    expect(parseQuantity('1.5')).toBe(1.5);
  });
  it('parses simple and mixed fractions', () => {
    expect(parseQuantity('1/2')).toBeCloseTo(0.5, 5);
    expect(parseQuantity('1 1/2')).toBeCloseTo(1.5, 5);
  });
  it('parses unicode fraction glyphs', () => {
    expect(parseQuantity('½')).toBe(0.5);
  });
  it('returns undefined for non-quantities', () => {
    expect(parseQuantity('chicken')).toBeUndefined();
  });
});

describe('parseIngredientLine', () => {
  it('splits quantity, unit and name and normalises grams', () => {
    const ing = parseIngredientLine('2 cups cooked brown rice');
    expect(ing.quantity).toBe(2);
    expect(ing.unit).toBe('cup');
    expect(ing.name).toBe('cooked brown rice');
    expect(ing.grams).toBe(480); // 2 * 240
  });

  it('handles a leading bullet and mixed number', () => {
    const ing = parseIngredientLine('- 1 1/2 tbsp olive oil');
    expect(ing.quantity).toBeCloseTo(1.5, 5);
    expect(ing.unit).toBe('tbsp');
    expect(ing.name).toBe('olive oil');
    expect(ing.grams).toBe(23); // round(1.5 * 15)
  });

  it('handles ounces alias', () => {
    const ing = parseIngredientLine('6 ounces chicken breast');
    expect(ing.unit).toBe('oz');
    expect(ing.grams).toBe(Math.round(6 * 28.35));
  });

  it('keeps the name when there is no quantity', () => {
    const ing = parseIngredientLine('salt to taste');
    expect(ing.name).toBe('salt to taste');
    expect(ing.quantity).toBeUndefined();
  });
});

describe('extractIngredientLines', () => {
  it('pulls ingredient-looking lines out of a transcript blob', () => {
    const transcript = [
      "Hey guys welcome back to the channel today we're making a bowl",
      '2 cups cooked brown rice',
      '- 6 oz grilled chicken',
      'so make sure you like and subscribe',
      '1/2 avocado',
    ].join('\n');
    const lines = extractIngredientLines(transcript);
    expect(lines).toEqual(['2 cups cooked brown rice', '- 6 oz grilled chicken', '1/2 avocado']);
  });
});

describe('ingredientsFromText', () => {
  it('returns structured ingredients', () => {
    const ings = ingredientsFromText('2 cups rice\n6 oz chicken');
    expect(ings).toHaveLength(2);
    expect(ings[0].grams).toBe(480);
  });
});

describe('per-serving nutrition', () => {
  it('divides totals across servings', () => {
    const ps = perServing(2000, { protein: 160, carbs: 200, fat: 60 }, 4);
    expect(ps.calories).toBe(500);
    expect(ps.macros.protein).toBe(40);
  });

  it('scales per-serving nutrition by servings eaten', () => {
    const recipe: Recipe = {
      id: 'r1',
      title: 'Bowl',
      source: 'fitmencook',
      servings: 4,
      ingredients: [],
      steps: [],
      perServing: { calories: 500, macros: { protein: 40, carbs: 50, fat: 15 } },
    };
    const eaten = nutritionForServings(recipe, 1.5);
    expect(eaten.calories).toBe(750);
    expect(eaten.macros.protein).toBe(60);
  });
});
