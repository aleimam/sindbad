import { describe, expect, it } from 'vitest';
import { egpForUsd } from './fx';

describe('egpForUsd — docs/02 §4 worked example', () => {
  it('$21.20 at 50 EGP/USD with 2% spread → 1,081.20 EGP total (spread ≈ 21.20 EGP)', () => {
    const q = egpForUsd(2120, 50, 2);
    expect(q.egpBaseMinor).toBe(106000); // 1,060.00 EGP
    expect(q.egpSpreadMinor).toBe(2120); // 21.20 EGP
    expect(q.egpTotalMinor).toBe(108120); // 1,081.20 EGP
  });

  it('zero spread at launch → base only', () => {
    const q = egpForUsd(2120, 50, 0);
    expect(q.egpSpreadMinor).toBe(0);
    expect(q.egpTotalMinor).toBe(106000);
  });

  it('rounds the base up (never undercharges) and handles awkward rates', () => {
    const q = egpForUsd(1, 49.4321, 0);
    expect(q.egpBaseMinor).toBe(50); // ceil(49.4321)
  });

  it('rejects nonsense inputs', () => {
    expect(() => egpForUsd(0, 50, 0)).toThrow();
    expect(() => egpForUsd(100, 0, 0)).toThrow();
  });
});
