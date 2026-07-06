/**
 * Weight trend analysis. Works with entries from any source (manual, Apple
 * Health, Renpho) — the domain does not care where the numbers came from.
 */

import { WeightEntry } from './types';

/** Sort weight entries chronologically (ascending). */
export function sortByTime(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Exponentially-weighted moving average of weight, which smooths out daily
 * fluctuation (hydration, food in gut) far better than raw readings. This is
 * the "trend weight" popularised by the Hacker's Diet.
 *
 * @param alpha smoothing factor 0..1; lower is smoother. 0.1 ≈ 10-day trend.
 */
export function trendWeight(entries: WeightEntry[], alpha = 0.1): {
  at: string;
  kg: number;
}[] {
  const sorted = sortByTime(entries);
  const out: { at: string; kg: number }[] = [];
  let trend: number | null = null;
  for (const e of sorted) {
    trend = trend === null ? e.kg : trend + alpha * (e.kg - trend);
    out.push({ at: e.at, kg: round1(trend) });
  }
  return out;
}

/** Latest recorded weight, or null if there are none. */
export function latestWeight(entries: WeightEntry[]): WeightEntry | null {
  const sorted = sortByTime(entries);
  return sorted.length ? sorted[sorted.length - 1] : null;
}

/**
 * Net change between the first and last reading in the list (kg). Positive
 * means weight gain over the period.
 */
export function netChangeKg(entries: WeightEntry[]): number {
  const sorted = sortByTime(entries);
  if (sorted.length < 2) return 0;
  return round1(sorted[sorted.length - 1].kg - sorted[0].kg);
}

/**
 * Estimated weekly rate of change (kg/week) from a linear fit over the entries'
 * time span. Useful for "on track to lose X/week" messaging.
 */
export function weeklyRateKg(entries: WeightEntry[]): number {
  const sorted = sortByTime(entries);
  if (sorted.length < 2) return 0;
  const t0 = Date.parse(sorted[0].at);
  const days =
    (Date.parse(sorted[sorted.length - 1].at) - t0) / (1000 * 60 * 60 * 24);
  if (days <= 0) return 0;
  const change = sorted[sorted.length - 1].kg - sorted[0].kg;
  return round2((change / days) * 7);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
