import { describe, expect, it } from 'vitest';
import {
  canAccept,
  canChangeFee,
  canComplete,
  canMarkArrived,
  canMarkReady,
  cancellation,
  nextStep,
  stepsComplete,
} from './deal-state';

describe('nextStep — Box (docs/02 §3)', () => {
  it('walks ORDERED → SHIPPED → DELIVERED → RECEIVED with the right actors', () => {
    expect(nextStep('BOX', null)).toEqual({ step: 'ORDERED', actor: 'SHOPPER' });
    expect(nextStep('BOX', 'ORDERED')).toEqual({ step: 'SHIPPED', actor: 'SHOPPER' });
    expect(nextStep('BOX', 'SHIPPED')).toEqual({
      step: 'DELIVERED_TO_TRAVELER',
      actor: 'SHOPPER',
    });
    expect(nextStep('BOX', 'DELIVERED_TO_TRAVELER')).toEqual({
      step: 'RECEIVED_BY_TRAVELER',
      actor: 'TRAVELER',
    });
    expect(nextStep('BOX', 'RECEIVED_BY_TRAVELER')).toBeNull();
  });
});

describe('nextStep — Basket', () => {
  it('walks ORDERED → SHIPPED → RECEIVED, all by the traveler (no courier step)', () => {
    expect(nextStep('BASKET', null)).toEqual({ step: 'ORDERED', actor: 'TRAVELER' });
    expect(nextStep('BASKET', 'ORDERED')).toEqual({ step: 'SHIPPED', actor: 'TRAVELER' });
    expect(nextStep('BASKET', 'SHIPPED')).toEqual({
      step: 'RECEIVED_BY_TRAVELER',
      actor: 'TRAVELER',
    });
    expect(nextStep('BASKET', 'RECEIVED_BY_TRAVELER')).toBeNull();
  });
});

describe('acceptance & fee negotiation', () => {
  it('only before the deal is accepted', () => {
    expect(canAccept('REQUESTED')).toBe(true);
    expect(canAccept('NEGOTIATING')).toBe(true);
    expect(canAccept('ONGOING')).toBe(false);
    expect(canChangeFee('NEGOTIATING')).toBe(true);
    expect(canChangeFee('READY_FOR_PICKUP')).toBe(false);
  });
});

describe('cancellation rules', () => {
  it('both parties may cancel while not accepted', () => {
    expect(cancellation('REQUESTED', null, 'TRAVELER')).toEqual({
      allowed: true,
      needsStaffApproval: false,
    });
    expect(cancellation('NEGOTIATING', null, 'SHOPPER')).toEqual({
      allowed: true,
      needsStaffApproval: false,
    });
  });

  it('traveler cannot cancel after acceptance', () => {
    expect(cancellation('ONGOING', null, 'TRAVELER').allowed).toBe(false);
  });

  it('shopper cancels freely while accepted but unstarted', () => {
    expect(cancellation('ONGOING', null, 'SHOPPER')).toEqual({
      allowed: true,
      needsStaffApproval: false,
    });
  });

  it('shopper cancelling at ORDERED+ needs staff approval', () => {
    expect(cancellation('ONGOING', 'ORDERED', 'SHOPPER')).toEqual({
      allowed: true,
      needsStaffApproval: true,
    });
    expect(cancellation('READY_FOR_PICKUP', 'RECEIVED_BY_TRAVELER', 'SHOPPER')).toEqual({
      allowed: true,
      needsStaffApproval: true,
    });
  });

  it('nobody cancels a completed or cancelled deal', () => {
    expect(cancellation('COMPLETED', null, 'SHOPPER').allowed).toBe(false);
    expect(cancellation('CANCELLED', null, 'SHOPPER').allowed).toBe(false);
  });
});

describe('trip-level transitions', () => {
  it('arrive only from ONGOING; ready only from ARRIVED; complete only from READY', () => {
    expect(canMarkArrived('ONGOING')).toBe(true);
    expect(canMarkArrived('REQUESTED')).toBe(false);
    expect(canMarkReady('ARRIVED_DESTINATION')).toBe(true);
    expect(canMarkReady('ONGOING')).toBe(false);
    expect(canComplete('READY_FOR_PICKUP')).toBe(true);
    expect(canComplete('ARRIVED_DESTINATION')).toBe(false);
  });

  it('stepsComplete requires RECEIVED_BY_TRAVELER', () => {
    expect(stepsComplete('BOX', 'RECEIVED_BY_TRAVELER')).toBe(true);
    expect(stepsComplete('BOX', 'DELIVERED_TO_TRAVELER')).toBe(false);
    expect(stepsComplete('BASKET', null)).toBe(false);
  });
});
