import { describe, expect, it } from 'vitest';
import { DEFAULT_STAR_POINTS, reviewWindow, starPoints, windowState } from './reviews';

const COMPLETED = new Date('2026-07-01T12:00:00Z');
const h = (hours: number) => new Date(COMPLETED.getTime() + hours * 60 * 60 * 1000);

describe('reviewWindow — +12h … +12d (approved P1)', () => {
  it('computes the bounds', () => {
    const w = reviewWindow(COMPLETED);
    expect(w.opensAt.toISOString()).toBe('2026-07-02T00:00:00.000Z');
    expect(w.closesAt.toISOString()).toBe('2026-07-13T12:00:00.000Z');
  });
});

describe('windowState', () => {
  it('LOCKED before +12h', () => {
    expect(windowState(COMPLETED, h(6))).toBe('LOCKED');
  });
  it('OPEN inside the window', () => {
    expect(windowState(COMPLETED, h(13))).toBe('OPEN');
    expect(windowState(COMPLETED, h(11 * 24))).toBe('OPEN');
  });
  it('CLOSED after +12d', () => {
    expect(windowState(COMPLETED, h(12 * 24 + 1))).toBe('CLOSED');
  });
});

describe('starPoints — approved default map', () => {
  it('maps 5★ +10 … 1★ −10', () => {
    expect(starPoints(5, DEFAULT_STAR_POINTS)).toBe(10);
    expect(starPoints(4, DEFAULT_STAR_POINTS)).toBe(5);
    expect(starPoints(3, DEFAULT_STAR_POINTS)).toBe(0);
    expect(starPoints(2, DEFAULT_STAR_POINTS)).toBe(-5);
    expect(starPoints(1, DEFAULT_STAR_POINTS)).toBe(-10);
  });
  it('clamps out-of-range inputs', () => {
    expect(starPoints(9, DEFAULT_STAR_POINTS)).toBe(10);
    expect(starPoints(0, DEFAULT_STAR_POINTS)).toBe(-10);
  });
});
