import {
  areaPixelsToCm2,
  densityForFood,
  estimatePortion,
  handPortionGuide,
  REFERENCE_ADULT_HAND,
  scaleCmPerPixel,
  volumeToGrams,
} from '../handScale';
import { HandReference } from '../types';

const hand: HandReference = {
  handLengthCm: 18.5,
  palmWidthCm: 8.5,
  calibratedAt: '2026-07-06T00:00:00.000Z',
};

describe('scaleCmPerPixel', () => {
  it('derives cm-per-pixel from hand length and pixel length', () => {
    // 18.5cm hand spanning 370px => 0.05 cm/px
    expect(scaleCmPerPixel(370, hand)).toBeCloseTo(0.05, 5);
  });

  it('rejects non-positive inputs', () => {
    expect(() => scaleCmPerPixel(0, hand)).toThrow();
    expect(() => scaleCmPerPixel(100, { handLengthCm: 0 })).toThrow();
  });
});

describe('area and volume conversions', () => {
  it('scales area with the square of the linear factor', () => {
    // 0.05 cm/px, 40000 px^2 => 40000 * 0.0025 = 100 cm^2
    expect(areaPixelsToCm2(40000, 0.05)).toBeCloseTo(100, 5);
  });

  it('converts volume to grams via density', () => {
    expect(volumeToGrams(200, 0.75)).toBeCloseTo(150, 5);
  });
});

describe('densityForFood', () => {
  it('matches known foods by substring', () => {
    expect(densityForFood('cooked brown rice')).toBe(0.75);
    expect(densityForFood('grilled chicken breast')).toBe(1.05);
  });
  it('falls back to default for unknown foods', () => {
    expect(densityForFood('mystery stew')).toBe(0.9);
  });
});

describe('estimatePortion', () => {
  it('produces a sensible gram estimate end-to-end', () => {
    // hand 370px, food footprint 40000px^2, depth 2cm, rice density 0.75
    // cm/px = 0.05; area = 100cm^2; volume = 200ml; grams = 150
    const est = estimatePortion({
      areaPixels: 40000,
      handPixelLength: 370,
      hand,
      depthCm: 2,
      foodName: 'brown rice',
    });
    expect(est.cmPerPixel).toBeCloseTo(0.05, 5);
    expect(est.areaCm2).toBeCloseTo(100, 5);
    expect(est.volumeMl).toBeCloseTo(200, 5);
    expect(est.grams).toBeCloseTo(150, 5);
  });

  it('scales grams up when the same food occupies more pixels', () => {
    const base = estimatePortion({ areaPixels: 40000, handPixelLength: 370, hand });
    const bigger = estimatePortion({ areaPixels: 80000, handPixelLength: 370, hand });
    expect(bigger.grams).toBeGreaterThan(base.grams);
  });
});

describe('handPortionGuide', () => {
  it('returns reference portions for a reference-sized hand', () => {
    const guide = handPortionGuide({ ...REFERENCE_ADULT_HAND, calibratedAt: 'x' } as HandReference);
    expect(guide.proteinPalmGrams).toBeCloseTo(100, 0);
    expect(guide.carbFistGrams).toBeCloseTo(150, 0);
  });

  it('scales portions up for a larger hand', () => {
    const big = handPortionGuide({
      handLengthCm: 21,
      palmWidthCm: 9.5,
      calibratedAt: 'x',
    });
    expect(big.proteinPalmGrams).toBeGreaterThan(100);
  });
});
