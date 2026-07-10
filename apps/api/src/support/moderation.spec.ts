import { describe, expect, it } from 'vitest';
import { holdUntilFrom, isHeld, isRestrictedPathAllowed } from './moderation';

describe('isRestrictedPathAllowed', () => {
  it('allows ongoing-deals-only surfaces with the /api prefix', () => {
    expect(isRestrictedPathAllowed('/api/deals/abc')).toBe(true);
    expect(isRestrictedPathAllowed('/api/chat/thread-1')).toBe(true);
    expect(isRestrictedPathAllowed('/api/auth/me')).toBe(true);
    expect(isRestrictedPathAllowed('/api/notifications')).toBe(true);
  });

  it('allows the same surfaces without the prefix', () => {
    expect(isRestrictedPathAllowed('/deals')).toBe(true);
  });

  it('denies new marketplace activity', () => {
    expect(isRestrictedPathAllowed('/api/trips')).toBe(false);
    expect(isRestrictedPathAllowed('/api/shipments')).toBe(false);
    expect(isRestrictedPathAllowed('/api/wallet/withdraw')).toBe(false);
    expect(isRestrictedPathAllowed('/api/verifications')).toBe(false);
  });

  it('denies an empty path', () => {
    expect(isRestrictedPathAllowed('/')).toBe(false);
    expect(isRestrictedPathAllowed('')).toBe(false);
  });
});

describe('holdUntilFrom', () => {
  it('adds whole days', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    expect(holdUntilFrom(now, 7)?.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('returns null for missing / non-positive durations', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    expect(holdUntilFrom(now, undefined)).toBeNull();
    expect(holdUntilFrom(now, 0)).toBeNull();
  });
});

describe('isHeld', () => {
  const now = new Date('2026-01-10T00:00:00.000Z');
  it('is held while holdUntil is in the future', () => {
    expect(isHeld(new Date('2026-01-11T00:00:00.000Z'), now)).toBe(true);
  });
  it('is not held once it lapses or is unset', () => {
    expect(isHeld(new Date('2026-01-09T00:00:00.000Z'), now)).toBe(false);
    expect(isHeld(null, now)).toBe(false);
    expect(isHeld(undefined, now)).toBe(false);
  });
});
