/**
 * The Deal state machine — pure functions, no I/O.
 * Source of truth: docs/02-domain-blueprint.md §3 (approved 2026-06-25).
 *
 * Path: REQUESTED → NEGOTIATING → ONGOING(steps) → ARRIVED_DESTINATION →
 *       READY_FOR_PICKUP → COMPLETED, with CANCELLED reachable per the rules.
 */

export type DealKind = 'BOX' | 'BASKET';
export type Party = 'TRAVELER' | 'SHOPPER';
export type Step = 'ORDERED' | 'SHIPPED' | 'DELIVERED_TO_TRAVELER' | 'RECEIVED_BY_TRAVELER';
export type Status =
  | 'REQUESTED'
  | 'NEGOTIATING'
  | 'ONGOING'
  | 'ARRIVED_DESTINATION'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

/** Ordered sub-steps inside ONGOING, with the only actor allowed to mark each. */
const STEPS: Record<DealKind, Array<{ step: Step; actor: Party }>> = {
  // Box: the shopper buys + ships to the traveler's address; the traveler confirms receipt.
  BOX: [
    { step: 'ORDERED', actor: 'SHOPPER' },
    { step: 'SHIPPED', actor: 'SHOPPER' },
    { step: 'DELIVERED_TO_TRAVELER', actor: 'SHOPPER' },
    { step: 'RECEIVED_BY_TRAVELER', actor: 'TRAVELER' },
  ],
  // Basket: the traveler buys the products himself.
  BASKET: [
    { step: 'ORDERED', actor: 'TRAVELER' },
    { step: 'SHIPPED', actor: 'TRAVELER' },
    { step: 'RECEIVED_BY_TRAVELER', actor: 'TRAVELER' },
  ],
};

/** The next ONGOING step after `current` (null current = first step), or null when done. */
export function nextStep(
  kind: DealKind,
  current: Step | null,
): { step: Step; actor: Party } | null {
  const steps = STEPS[kind];
  if (current === null) return steps[0]!;
  const idx = steps.findIndex((s) => s.step === current);
  if (idx === -1 || idx === steps.length - 1) return null;
  return steps[idx + 1]!;
}

/** All ONGOING steps completed → the trip-level "arrived" flow may include this deal. */
export function stepsComplete(kind: DealKind, current: Step | null): boolean {
  return current === 'RECEIVED_BY_TRAVELER';
}

export function canAccept(status: Status): boolean {
  return status === 'REQUESTED' || status === 'NEGOTIATING';
}

export function canChangeFee(status: Status): boolean {
  return status === 'REQUESTED' || status === 'NEGOTIATING';
}

/**
 * Cancellation (docs/02 §3):
 *  - both parties: freely while not yet accepted (REQUESTED / NEGOTIATING);
 *  - shopper: any time before COMPLETED — but from ONGOING(ORDERED)+ it needs a
 *    reason and staff approval (skeleton: flagged via `needsStaffApproval`).
 */
export function cancellation(
  status: Status,
  ongoingStep: Step | null,
  party: Party,
): { allowed: boolean; needsStaffApproval: boolean } {
  if (status === 'COMPLETED' || status === 'CANCELLED')
    return { allowed: false, needsStaffApproval: false };
  if (status === 'REQUESTED' || status === 'NEGOTIATING')
    return { allowed: true, needsStaffApproval: false };
  if (party !== 'SHOPPER') return { allowed: false, needsStaffApproval: false };
  const progressed = status !== 'ONGOING' || ongoingStep !== null;
  return { allowed: true, needsStaffApproval: progressed };
}

export function canMarkArrived(status: Status): boolean {
  return status === 'ONGOING';
}

export function canMarkReady(status: Status): boolean {
  return status === 'ARRIVED_DESTINATION';
}

export function canComplete(status: Status): boolean {
  return status === 'READY_FOR_PICKUP';
}

// ── Flags & the Resolution green flag (docs/02 §3) ──

export interface FlagLike {
  type: 'DELAYED' | 'CUSTOMS' | 'PARTIALLY';
  active: boolean;
}

export interface ResolutionLike {
  status: 'PROPOSED' | 'APPROVED';
  proposedByAccountId: string;
}

/**
 * Deals carrying an active PARTIALLY or CUSTOMS flag need an APPROVED resolution
 * (the green flag) before they may be completed. DELAYED alone does not block.
 */
export function completionBlocked(
  flags: FlagLike[],
  resolution: ResolutionLike | null,
): boolean {
  const needsResolution = flags.some(
    (f) => f.active && (f.type === 'PARTIALLY' || f.type === 'CUSTOMS'),
  );
  if (!needsResolution) return false;
  return resolution?.status !== 'APPROVED';
}

/**
 * Resolution approval: only the party who did NOT write the current text may approve.
 * An edit by the other party moves proposership — the original proposer must re-approve.
 */
export function canApproveResolution(
  resolution: ResolutionLike,
  actingAccountId: string,
): boolean {
  return resolution.status === 'PROPOSED' && resolution.proposedByAccountId !== actingAccountId;
}
