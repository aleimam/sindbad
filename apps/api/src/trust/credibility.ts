/**
 * Credibility scoring — pure (docs/02 §5, approved).
 *
 * Score = Σ verification points (no decay, while verified)
 *       + Σ (trip/shipment/review points × age-weight)
 *       + Σ admin adjustments (no decay)
 *
 * Age weights (admin-tunable): 0–12 months ×1.0 · 13–36 months ×0.5 · older = 0.
 * Raw negative → clamp to 0 and flag the account for block (decision G3).
 */

export interface CredibilityWeights {
  window1Months: number; // full-weight window
  window1Weight: number;
  window2Months: number; // reduced-weight window end
  window2Weight: number;
}

export interface TierThresholds {
  BRONZE: number;
  SILVER: number;
  GOLD: number;
  PLATINUM: number;
}

export const DEFAULT_WEIGHTS: CredibilityWeights = {
  window1Months: 12,
  window1Weight: 1,
  window2Months: 36,
  window2Weight: 0.5,
};

export const DEFAULT_TIERS: TierThresholds = { BRONZE: 10, SILVER: 30, GOLD: 60, PLATINUM: 90 };

export interface CredibilityEventLike {
  points: number;
  timeWeighted: boolean;
  createdAt: Date;
}

export function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
}

export function ageWeight(createdAt: Date, now: Date, w: CredibilityWeights): number {
  const months = monthsBetween(createdAt, now);
  if (months <= w.window1Months) return w.window1Weight;
  if (months <= w.window2Months) return w.window2Weight;
  return 0;
}

export function computeScore(
  events: CredibilityEventLike[],
  now: Date,
  weights: CredibilityWeights,
): { rawScore: number; displayScore: number; flaggedForBlock: boolean } {
  let raw = 0;
  for (const e of events) {
    raw += e.timeWeighted ? e.points * ageWeight(e.createdAt, now, weights) : e.points;
  }
  const rawScore = Math.round(raw);
  return {
    rawScore,
    displayScore: Math.max(0, rawScore),
    flaggedForBlock: rawScore < 0,
  };
}

export function tierFor(score: number, t: TierThresholds): string {
  if (score >= t.PLATINUM) return 'PLATINUM';
  if (score >= t.GOLD) return 'GOLD';
  if (score >= t.SILVER) return 'SILVER';
  if (score >= t.BRONZE) return 'BRONZE';
  return 'NEW';
}
