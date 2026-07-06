/** Minimal design tokens shared across screens. */
export const colors = {
  bg: '#0e1116',
  card: '#171b22',
  cardAlt: '#1f242d',
  border: '#262c36',
  text: '#e8eaed',
  subtext: '#9aa4b2',
  accent: '#4ade80', // green — health
  accentDim: '#14532d',
  protein: '#f87171',
  carbs: '#60a5fa',
  fat: '#fbbf24',
  alcohol: '#a78bfa',
  danger: '#ef4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

/**
 * Bottom padding every scroll view adds so its last content clears the tab bar
 * and the floating action button that sits above it.
 */
export const DOCK_CLEARANCE = 108;
