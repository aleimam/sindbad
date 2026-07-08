/**
 * Review window rules — pure (docs/02 §3, approved):
 * opens completedAt + 12h · closes completedAt + 12 days · blind until both
 * submit or the window closes (a lone review reveals at the deadline).
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface ReviewWindow {
  opensAt: Date;
  closesAt: Date;
}

export function reviewWindow(completedAt: Date): ReviewWindow {
  return {
    opensAt: new Date(completedAt.getTime() + 12 * HOUR),
    closesAt: new Date(completedAt.getTime() + 12 * DAY),
  };
}

export type WindowState = 'LOCKED' | 'OPEN' | 'CLOSED';

export function windowState(completedAt: Date, now: Date): WindowState {
  const w = reviewWindow(completedAt);
  if (now < w.opensAt) return 'LOCKED';
  if (now > w.closesAt) return 'CLOSED';
  return 'OPEN';
}

/** Star → credibility points (admin-tunable; approved defaults 5★+10 … 1★−10). */
export type StarPointsMap = Record<'1' | '2' | '3' | '4' | '5', number>;

export const DEFAULT_STAR_POINTS: StarPointsMap = { '1': -10, '2': -5, '3': 0, '4': 5, '5': 10 };

export function starPoints(stars: number, map: StarPointsMap): number {
  return map[String(Math.min(5, Math.max(1, Math.round(stars)))) as keyof StarPointsMap];
}
