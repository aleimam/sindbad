import { describe, expect, it } from 'vitest';
import {
  evaluateMatch,
  isWindowOpen,
  shipmentTotalWeight,
  type ShipmentForMatch,
  type TripForMatch,
} from './matching';

const NOW = new Date('2026-07-01T12:00:00Z');

function trip(overrides: Partial<TripForMatch> = {}): TripForMatch {
  return {
    originCountryId: 'US',
    destinationCountryId: 'EG',
    receivingEnd: new Date('2026-07-10'),
    availableWeightKg: 10,
    categoryStances: new Map([
      ['electronics', 'ACCEPT'],
      ['clothing', 'ACCEPT'],
      ['toys', 'ASK'],
    ]),
    ...overrides,
  };
}

function shipment(overrides: Partial<ShipmentForMatch> = {}): ShipmentForMatch {
  return {
    originCountryId: 'US',
    destinationCountryId: 'EG',
    itemCategoryIds: ['electronics'],
    totalWeightKg: 3.5,
    ...overrides,
  };
}

describe('gate 1 — countries', () => {
  it('requires exact origin and destination', () => {
    expect(evaluateMatch(trip(), shipment(), NOW)).toEqual({ match: true, askFlagged: false });
    expect(evaluateMatch(trip(), shipment({ originCountryId: 'GB' }), NOW)).toEqual({
      match: false,
    });
    expect(evaluateMatch(trip(), shipment({ destinationCountryId: 'US' }), NOW)).toEqual({
      match: false,
    });
  });
});

describe('gate 2 — receiving window', () => {
  it('open strictly after today (spec: past or today excluded)', () => {
    expect(isWindowOpen(new Date('2026-07-10'), NOW)).toBe(true);
    expect(isWindowOpen(new Date('2026-07-01'), NOW)).toBe(false); // today
    expect(isWindowOpen(new Date('2026-06-30'), NOW)).toBe(false); // past
  });

  it('window-closed trips never match', () => {
    expect(evaluateMatch(trip({ receivingEnd: new Date('2026-07-01') }), shipment(), NOW)).toEqual(
      { match: false },
    );
  });
});

describe('gate 3 — categories', () => {
  it('all Accept → clean match', () => {
    expect(
      evaluateMatch(trip(), shipment({ itemCategoryIds: ['electronics', 'clothing'] }), NOW),
    ).toEqual({ match: true, askFlagged: false });
  });

  it('any Ask (none rejected) → match flagged for the traveler', () => {
    expect(
      evaluateMatch(trip(), shipment({ itemCategoryIds: ['electronics', 'toys'] }), NOW),
    ).toEqual({ match: true, askFlagged: true });
  });

  it('any category missing from the allowed set → no match', () => {
    expect(
      evaluateMatch(trip(), shipment({ itemCategoryIds: ['electronics', 'perfume'] }), NOW),
    ).toEqual({ match: false });
  });
});

describe('gate 4 — weight', () => {
  it('total volumetric weight must fit the available weight', () => {
    expect(evaluateMatch(trip(), shipment({ totalWeightKg: 10 }), NOW)).toEqual({
      match: true,
      askFlagged: false,
    });
    expect(evaluateMatch(trip(), shipment({ totalWeightKg: 10.1 }), NOW)).toEqual({
      match: false,
    });
  });

  it('shipmentTotalWeight multiplies by count', () => {
    expect(
      shipmentTotalWeight([
        { volumetricWeightKg: 1.5, count: 2 },
        { volumetricWeightKg: 0.5, count: 1 },
      ]),
    ).toBe(3.5);
  });
});
