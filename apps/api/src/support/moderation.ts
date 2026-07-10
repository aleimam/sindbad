/** Pure moderation helpers (tested; used by the guard and complaints service). */

/** Path roots a BLOCKED / held account may still reach (ongoing-deals-only access). */
export const RESTRICTED_ALLOW_PREFIXES = [
  'auth',
  'deals',
  'chat',
  'notifications',
  'complaints',
  'media',
  'pages',
  'meta',
  'health',
] as const;

/** Given an Express path (may include the `/api` global prefix), is it allowed for a restricted user? */
export function isRestrictedPathAllowed(path: string): boolean {
  const segments = path.split('/').filter(Boolean); // "/api/deals/1" → ["api","deals","1"]
  const root = segments[0] === 'api' ? segments[1] : segments[0];
  return root != null && (RESTRICTED_ALLOW_PREFIXES as readonly string[]).includes(root);
}

/** When a membership hold should lapse, or null if not a hold. */
export function holdUntilFrom(now: Date, holdDays?: number): Date | null {
  if (!holdDays || holdDays <= 0) return null;
  return new Date(now.getTime() + holdDays * 24 * 60 * 60 * 1000);
}

/** Is the account currently under an active hold? */
export function isHeld(holdUntil: Date | null | undefined, now: Date): boolean {
  return holdUntil != null && holdUntil > now;
}
