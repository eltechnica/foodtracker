import { coerceReceipt } from '../receipt';
import { coerceIngredients } from '../ingredients';
import { MockVisionProvider } from '../mockProvider';

describe('coerceReceipt', () => {
  it('normalises messy model output', () => {
    const raw = {
      merchant: '  Whole Foods  ',
      total: '$42.50',
      currency: 'usd',
      date: '2026-07-05',
      category: 'grocery',
      containsAlcohol: false,
      lineItems: [
        { name: ' Bananas ', price: '2.10' },
        { name: '', price: 5 }, // dropped: no name
      ],
      extra: 'ignored',
    };
    const r = coerceReceipt(raw, 'test');
    expect(r.merchant).toBe('Whole Foods');
    expect(r.total).toBe(42.5);
    expect(r.currency).toBe('USD');
    expect(r.date).toBe('2026-07-05');
    expect(r.category).toBe('grocery');
    expect(r.lineItems).toHaveLength(1);
    expect(r.lineItems[0]).toEqual({ name: 'Bananas', price: 2.1 });
  });

  it('falls back to summing line items when total is missing', () => {
    const r = coerceReceipt(
      { merchant: 'Corner Store', lineItems: [{ name: 'a', price: 3 }, { name: 'b', price: 4 }] },
      'test',
    );
    expect(r.total).toBe(7);
  });

  it('classifies category and alcohol when the model omits them', () => {
    const r = coerceReceipt(
      { merchant: 'City Liquor', lineItems: [{ name: 'Merlot', price: 18 }] },
      'test',
    );
    expect(r.category).toBe('alcohol');
    expect(r.containsAlcohol).toBe(true);
  });

  it('drops an invalid date and defaults currency', () => {
    const r = coerceReceipt({ merchant: 'X', total: 5, date: 'yesterday' }, 'test');
    expect(r.date).toBeUndefined();
    expect(r.currency).toBe('USD');
  });
});

describe('coerceIngredients', () => {
  it('keeps non-empty trimmed lines and title', () => {
    const r = coerceIngredients(
      { title: '  Bowl ', ingredients: [' 2 cups rice ', '', 42, '6 oz chicken'] },
      'test',
    );
    expect(r.title).toBe('Bowl');
    expect(r.ingredients).toEqual(['2 cups rice', '6 oz chicken']);
  });
  it('handles missing ingredients array', () => {
    const r = coerceIngredients({}, 'test');
    expect(r.ingredients).toEqual([]);
    expect(r.title).toBeUndefined();
  });
});

describe('MockVisionProvider new capabilities', () => {
  it('returns a receipt with the right shape', async () => {
    const r = await new MockVisionProvider().analyzeReceipt({ imageBase64: 'A', mimeType: 'image/jpeg' });
    expect(r.total).toBeGreaterThan(0);
    expect(['grocery', 'dining', 'alcohol', 'other']).toContain(r.category);
    expect(r.lineItems.length).toBeGreaterThan(0);
  });
  it('returns ingredient lines', async () => {
    const r = await new MockVisionProvider().analyzeIngredients({ imageBase64: 'A', mimeType: 'image/jpeg' });
    expect(r.ingredients.length).toBeGreaterThan(0);
  });
});
