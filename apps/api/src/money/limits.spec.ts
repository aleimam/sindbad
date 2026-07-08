import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMITS, limitError } from './limits';

describe('limitError — docs/02 money limits', () => {
  it('accepts amounts inside the band', () => {
    expect(limitError(DEFAULT_LIMITS, 'USD', 1_000)).toBeNull(); // $10 min
    expect(limitError(DEFAULT_LIMITS, 'USD', 100_000)).toBeNull(); // $1,000 max
    expect(limitError(DEFAULT_LIMITS, 'EGP', 50_000)).toBeNull(); // 500 EGP min
    expect(limitError(DEFAULT_LIMITS, 'EGP', 5_000_000)).toBeNull(); // 50k EGP max
  });

  it('rejects out-of-band and invalid amounts', () => {
    expect(limitError(DEFAULT_LIMITS, 'USD', 999)).toContain('Minimum');
    expect(limitError(DEFAULT_LIMITS, 'USD', 100_001)).toContain('Maximum');
    expect(limitError(DEFAULT_LIMITS, 'EGP', 49_999)).toContain('Minimum');
    expect(limitError(DEFAULT_LIMITS, 'USD', -5)).toContain('positive');
    expect(limitError(DEFAULT_LIMITS, 'USD', 10.5)).toContain('positive');
  });
});
