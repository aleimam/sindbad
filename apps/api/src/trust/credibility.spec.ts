import { describe, expect, it } from 'vitest';
import {
  ageWeight,
  computeScore,
  DEFAULT_TIERS,
  DEFAULT_WEIGHTS,
  tierFor,
  type CredibilityEventLike,
} from './credibility';

const NOW = new Date('2026-07-01T00:00:00Z');
const monthsAgo = (m: number) => new Date(NOW.getTime() - m * 30.44 * 24 * 60 * 60 * 1000);
const ev = (points: number, createdAt: Date, timeWeighted = true): CredibilityEventLike => ({
  points,
  timeWeighted,
  createdAt,
});

describe('ageWeight — 0–12 ×1.0 · 13–36 ×0.5 · older 0 (approved defaults)', () => {
  it('applies the three windows', () => {
    expect(ageWeight(monthsAgo(3), NOW, DEFAULT_WEIGHTS)).toBe(1);
    expect(ageWeight(monthsAgo(20), NOW, DEFAULT_WEIGHTS)).toBe(0.5);
    expect(ageWeight(monthsAgo(40), NOW, DEFAULT_WEIGHTS)).toBe(0);
  });
});

describe('computeScore — the docs/02 §5 worked example (78 → Gold)', () => {
  it('verifications 23 + trips 14 + shipments 6 + reviews 35 = 78', () => {
    const events: CredibilityEventLike[] = [
      // Verifications: ID +15, phone +5, email +3 — no decay
      ev(15, monthsAgo(30), false),
      ev(5, monthsAgo(30), false),
      ev(3, monthsAgo(30), false),
      // Trips: 3 recent ×4 + 1 old (13–36mo) ×4×0.5
      ev(4, monthsAgo(2)),
      ev(4, monthsAgo(4)),
      ev(4, monthsAgo(6)),
      ev(4, monthsAgo(20)),
      // Shipments: 2 recent ×3
      ev(3, monthsAgo(1)),
      ev(3, monthsAgo(3)),
      // Reviews: four recent 5★ (+10) and one 2★ (−5)
      ev(10, monthsAgo(1)),
      ev(10, monthsAgo(2)),
      ev(10, monthsAgo(3)),
      ev(10, monthsAgo(5)),
      ev(-5, monthsAgo(2)),
    ];
    const result = computeScore(events, NOW, DEFAULT_WEIGHTS);
    expect(result.rawScore).toBe(78);
    expect(result.displayScore).toBe(78);
    expect(result.flaggedForBlock).toBe(false);
    expect(tierFor(result.displayScore, DEFAULT_TIERS)).toBe('GOLD');
  });

  it('events older than 36 months contribute nothing', () => {
    const result = computeScore([ev(100, monthsAgo(48))], NOW, DEFAULT_WEIGHTS);
    expect(result.rawScore).toBe(0);
  });

  it('raw negative → display 0 + flagged for block (decision G3)', () => {
    const result = computeScore([ev(-30, monthsAgo(1)), ev(5, monthsAgo(1), false)], NOW, DEFAULT_WEIGHTS);
    expect(result.rawScore).toBe(-25);
    expect(result.displayScore).toBe(0);
    expect(result.flaggedForBlock).toBe(true);
  });
});

describe('tierFor — approved thresholds', () => {
  it('maps the bands', () => {
    expect(tierFor(0, DEFAULT_TIERS)).toBe('NEW');
    expect(tierFor(10, DEFAULT_TIERS)).toBe('BRONZE');
    expect(tierFor(30, DEFAULT_TIERS)).toBe('SILVER');
    expect(tierFor(60, DEFAULT_TIERS)).toBe('GOLD');
    expect(tierFor(90, DEFAULT_TIERS)).toBe('PLATINUM');
    expect(tierFor(89, DEFAULT_TIERS)).toBe('GOLD');
  });
});
