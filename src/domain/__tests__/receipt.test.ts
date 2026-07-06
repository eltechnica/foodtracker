import {
  classifyReceiptCategory,
  receiptContainsAlcohol,
  sumLineItems,
} from '../receipt';

describe('classifyReceiptCategory', () => {
  it('classifies a supermarket as grocery', () => {
    expect(classifyReceiptCategory('Whole Foods Market', ['bananas', 'milk'])).toBe('grocery');
    expect(classifyReceiptCategory('Trader Joe\'s')).toBe('grocery');
  });
  it('classifies a restaurant/cafe as dining', () => {
    expect(classifyReceiptCategory('The Corner Bistro', ['burger'])).toBe('dining');
    expect(classifyReceiptCategory('Starbucks')).toBe('dining');
  });
  it('classifies a liquor store as alcohol', () => {
    expect(classifyReceiptCategory('Total Wine & More')).toBe('alcohol');
    expect(classifyReceiptCategory('City Liquor')).toBe('alcohol');
  });
  it('falls back to item hints, then basket size, then other', () => {
    expect(classifyReceiptCategory(undefined, ['produce', 'eggs'])).toBe('grocery');
    expect(classifyReceiptCategory('Unknown Shop', ['a', 'b', 'c', 'd'])).toBe('grocery');
    expect(classifyReceiptCategory('Unknown Shop', ['one thing'])).toBe('other');
  });
});

describe('receiptContainsAlcohol', () => {
  it('detects alcoholic items', () => {
    expect(receiptContainsAlcohol(['Bananas', 'IPA 6-pack'])).toBe(true);
    expect(receiptContainsAlcohol(['Cabernet Sauvignon'])).toBe(true);
  });
  it('is false for a sober basket', () => {
    expect(receiptContainsAlcohol(['Bananas', 'Chicken', 'Rice'])).toBe(false);
  });
});

describe('sumLineItems', () => {
  it('sums prices and rounds to cents', () => {
    expect(sumLineItems([{ name: 'a', price: 2.1 }, { name: 'b', price: 11.45 }])).toBe(13.55);
  });
  it('tolerates missing prices', () => {
    expect(sumLineItems([{ name: 'a', price: 0 }, { name: 'b', price: 5 }])).toBe(5);
  });
});
