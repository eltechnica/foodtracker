import { latestWeight, netChangeKg, trendWeight, weeklyRateKg } from '../weight';
import { WeightEntry } from '../types';

const entries: WeightEntry[] = [
  { id: '1', at: '2026-06-01T07:00:00.000Z', kg: 85, source: 'manual' },
  { id: '2', at: '2026-06-08T07:00:00.000Z', kg: 84.4, source: 'renpho' },
  { id: '3', at: '2026-06-15T07:00:00.000Z', kg: 83.9, source: 'renpho' },
  { id: '4', at: '2026-06-22T07:00:00.000Z', kg: 83.1, source: 'apple-health' },
];

describe('latestWeight', () => {
  it('returns the most recent entry regardless of input order', () => {
    const shuffled = [entries[2], entries[0], entries[3], entries[1]];
    expect(latestWeight(shuffled)!.id).toBe('4');
  });
  it('returns null for empty input', () => {
    expect(latestWeight([])).toBeNull();
  });
});

describe('netChangeKg', () => {
  it('computes signed change first-to-last', () => {
    expect(netChangeKg(entries)).toBeCloseTo(-1.9, 5);
  });
  it('is 0 with fewer than two entries', () => {
    expect(netChangeKg([entries[0]])).toBe(0);
  });
});

describe('trendWeight', () => {
  it('starts at the first reading and smooths toward later readings', () => {
    const trend = trendWeight(entries, 0.5);
    expect(trend[0].kg).toBe(85);
    // trend should be monotonically decreasing here and above the raw min
    expect(trend[trend.length - 1].kg).toBeLessThan(85);
    expect(trend[trend.length - 1].kg).toBeGreaterThan(83.1);
  });
});

describe('weeklyRateKg', () => {
  it('estimates kg/week over the span', () => {
    // -1.9kg over 21 days => ~-0.63 kg/week
    expect(weeklyRateKg(entries)).toBeCloseTo(-0.63, 1);
  });
  it('is 0 with insufficient data', () => {
    expect(weeklyRateKg([entries[0]])).toBe(0);
  });
});
