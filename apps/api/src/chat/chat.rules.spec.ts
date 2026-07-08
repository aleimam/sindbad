import { describe, expect, it } from 'vitest';
import { canEditMessage, orderedPair, receiptOf } from './chat.rules';

const T0 = new Date('2026-07-01T12:00:00Z');
const plusMin = (m: number) => new Date(T0.getTime() + m * 60_000);

describe('canEditMessage — 15-minute window (spec)', () => {
  it('allows within 15 minutes, rejects after', () => {
    expect(canEditMessage(T0, plusMin(14))).toBe(true);
    expect(canEditMessage(T0, plusMin(15))).toBe(true);
    expect(canEditMessage(T0, plusMin(16))).toBe(false);
  });
});

describe('orderedPair — one thread per pair', () => {
  it('orders consistently regardless of argument order', () => {
    expect(orderedPair('b', 'a')).toEqual({ accountAId: 'a', accountBId: 'b' });
    expect(orderedPair('a', 'b')).toEqual({ accountAId: 'a', accountBId: 'b' });
  });
});

describe('receiptOf — ✓ / ✓✓ gray / ✓✓ blue', () => {
  it('maps timestamps to tick states', () => {
    expect(receiptOf({ deliveredAt: null, readAt: null })).toBe('SENT');
    expect(receiptOf({ deliveredAt: T0, readAt: null })).toBe('DELIVERED');
    expect(receiptOf({ deliveredAt: T0, readAt: T0 })).toBe('READ');
  });
});
