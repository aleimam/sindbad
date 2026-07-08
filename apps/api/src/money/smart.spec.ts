import { describe, expect, it } from 'vitest';
import { applyRatio, calibrationRatio } from './smart';

describe('calibrationRatio', () => {
  it('odd count → middle ratio', () => {
    expect(
      calibrationRatio([
        { agreedMinor: 1000, predictedMinor: 1000 }, // 1.0
        { agreedMinor: 1200, predictedMinor: 1000 }, // 1.2
        { agreedMinor: 1500, predictedMinor: 1000 }, // 1.5
      ]),
    ).toBe(1.2);
  });

  it('even count → mean of the middle two', () => {
    expect(
      calibrationRatio([
        { agreedMinor: 1000, predictedMinor: 1000 },
        { agreedMinor: 1100, predictedMinor: 1000 },
        { agreedMinor: 1300, predictedMinor: 1000 },
        { agreedMinor: 2000, predictedMinor: 1000 },
      ]),
    ).toBeCloseTo(1.2);
  });

  it('outliers do not skew the median', () => {
    const ratio = calibrationRatio([
      { agreedMinor: 1000, predictedMinor: 1000 },
      { agreedMinor: 1000, predictedMinor: 1000 },
      { agreedMinor: 1000, predictedMinor: 1000 },
      { agreedMinor: 99000, predictedMinor: 1000 }, // one crazy negotiation
    ]);
    expect(ratio).toBe(1.0);
  });

  it('ignores invalid samples; empty → null', () => {
    expect(calibrationRatio([{ agreedMinor: 0, predictedMinor: 1000 }])).toBeNull();
    expect(calibrationRatio([])).toBeNull();
  });
});

describe('applyRatio', () => {
  it('scales W and F, leaves B, rounds to integers', () => {
    const next = applyRatio({ basketMultiplier: 1.3, weightUsdPerKg: 300, floorFeeUsd: 500 }, 1.1);
    expect(next).toEqual({ basketMultiplier: 1.3, weightUsdPerKg: 330, floorFeeUsd: 550 });
  });
  it('never proposes a zero weight parameter', () => {
    expect(applyRatio({ basketMultiplier: 1, weightUsdPerKg: 1, floorFeeUsd: 0 }, 0.1).weightUsdPerKg).toBe(1);
  });
});
