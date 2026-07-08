/**
 * Matching rules — pure functions, no I/O.
 * Source: docs/02-domain-blueprint.md §5 (approved 2026-06-25).
 *
 * A Trip matches a Shipment when ALL hold:
 *  1. exact origin + destination countries;
 *  2. the trip's receiving window is still open (today < receivingEnd; spec: a trip
 *     whose last receiving date is past OR TODAY cannot take deals);
 *  3. every item category is allowed by the trip (Reject ⇒ no; all Accept ⇒ yes;
 *     any Ask ⇒ match flagged for traveler confirmation);
 *  4. shipment total volumetric weight ≤ the trip's remaining available weight
 *     (cyclic trips do not deplete).
 */

export type CategoryStance = 'ACCEPT' | 'REJECT' | 'ASK';

export interface TripForMatch {
  originCountryId: string;
  destinationCountryId: string;
  receivingEnd: Date;
  availableWeightKg: number;
  /** stance per categoryId; a category missing from the map = REJECT */
  categoryStances: Map<string, CategoryStance>;
}

export interface ShipmentForMatch {
  originCountryId: string;
  destinationCountryId: string;
  itemCategoryIds: string[];
  totalWeightKg: number;
}

export type MatchResult = { match: false } | { match: true; askFlagged: boolean };

export function shipmentTotalWeight(items: Array<{ volumetricWeightKg: number; count: number }>) {
  return items.reduce((sum, i) => sum + i.volumetricWeightKg * i.count, 0);
}

export function isWindowOpen(receivingEnd: Date, now: Date): boolean {
  // "last receiving date in the past or today" excludes the trip → strictly after today.
  const endDay = new Date(receivingEnd);
  endDay.setHours(23, 59, 59, 999);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  return endDay.getTime() > todayEnd.getTime();
}

export function evaluateMatch(
  trip: TripForMatch,
  shipment: ShipmentForMatch,
  now = new Date(),
): MatchResult {
  // 1 — countries
  if (
    trip.originCountryId !== shipment.originCountryId ||
    trip.destinationCountryId !== shipment.destinationCountryId
  )
    return { match: false };

  // 2 — window
  if (!isWindowOpen(trip.receivingEnd, now)) return { match: false };

  // 3 — categories
  let askFlagged = false;
  for (const categoryId of shipment.itemCategoryIds) {
    const stance = trip.categoryStances.get(categoryId) ?? 'REJECT';
    if (stance === 'REJECT') return { match: false };
    if (stance === 'ASK') askFlagged = true;
  }

  // 4 — weight
  if (shipment.totalWeightKg > trip.availableWeightKg) return { match: false };

  return { match: true, askFlagged };
}
