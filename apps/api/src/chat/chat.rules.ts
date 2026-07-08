/** Chat rules — pure (docs/02 §9). */

const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Spec: users can edit their own messages within 15 minutes. */
export function canEditMessage(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() <= EDIT_WINDOW_MS;
}

/** Threads store the account pair ordered so each pair maps to exactly one thread. */
export function orderedPair(a: string, b: string): { accountAId: string; accountBId: string } {
  return a < b ? { accountAId: a, accountBId: b } : { accountAId: b, accountBId: a };
}

/** Tick state for the UI: single gray / double gray / double blue. */
export type Receipt = 'SENT' | 'DELIVERED' | 'READ';

export function receiptOf(message: { deliveredAt: Date | null; readAt: Date | null }): Receipt {
  if (message.readAt) return 'READ';
  if (message.deliveredAt) return 'DELIVERED';
  return 'SENT';
}
