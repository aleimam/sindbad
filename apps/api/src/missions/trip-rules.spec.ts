import { describe, expect, it } from 'vitest';
import { classifyTripEdit, dateOrderError } from './trip-rules';

const d = (s: string) => new Date(s);

describe('dateOrderError — receivingStart ≤ receivingEnd ≤ tripDate ≤ deliveryDate', () => {
  const base = {
    receivingStart: d('2026-07-01'),
    receivingEnd: d('2026-07-10'),
    tripDate: d('2026-07-12'),
    deliveryDate: d('2026-07-15'),
  };

  it('valid ordering passes', () => {
    expect(dateOrderError(base)).toBeNull();
  });

  it('optional receivingStart may be absent (open window)', () => {
    expect(dateOrderError({ ...base, receivingStart: null })).toBeNull();
  });

  it('violations are caught', () => {
    expect(dateOrderError({ ...base, receivingStart: d('2026-07-11') })).toContain('start');
    expect(dateOrderError({ ...base, receivingEnd: d('2026-07-13') })).toContain('window');
    expect(dateOrderError({ ...base, deliveryDate: d('2026-07-11') })).toContain('Delivery');
  });
});

describe('classifyTripEdit — spec edit rules', () => {
  it('splits free fields from approval-gated dates and delivery date', () => {
    const c = classifyTripEdit({
      notes: 'new notes',
      availableWeightKg: 8,
      tripDate: d('2026-07-20'),
      receivingEnd: d('2026-07-18'),
      deliveryDate: d('2026-07-25'),
    });
    expect(c.free).toEqual({ notes: 'new notes', availableWeightKg: 8 });
    expect(Object.keys(c.approvalDates).sort()).toEqual(['receivingEnd', 'tripDate']);
    expect(c.deliveryDate).toEqual(d('2026-07-25'));
  });

  it('category / weight / notes / address / fee / travelers are all free', () => {
    const c = classifyTripEdit({
      allowedCategoryIds: ['x'],
      availableWeightKg: 5,
      notes: 'n',
      receivingAddress: 'a',
      deliveryLocation: 'l',
      feeUsd: 100,
      travelerCount: 2,
    });
    expect(Object.keys(c.free)).toHaveLength(7);
    expect(Object.keys(c.approvalDates)).toHaveLength(0);
    expect(c.deliveryDate).toBeUndefined();
  });

  it('undefined fields are ignored', () => {
    const c = classifyTripEdit({ notes: undefined, tripDate: undefined });
    expect(c.free).toEqual({});
    expect(c.approvalDates).toEqual({});
  });
});
