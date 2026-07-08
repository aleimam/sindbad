/**
 * Trip edit rules — pure functions (spec "Users can update their trips", docs/02 §3).
 *
 *  - Dates of an APPROVED (active) trip need re-approval → ChangeRequest ("Edit Approvals").
 *  - Delivery date: editable directly only while the trip has no accepted deals.
 *  - Categories, weight, notes, addresses, fee, travelers: freely editable.
 */

export interface TripDates {
  receivingStart?: Date | null;
  receivingEnd: Date;
  tripDate: Date;
  deliveryDate: Date;
}

/** Blueprint invariant: receivingStart ≤ receivingEnd ≤ tripDate ≤ deliveryDate. */
export function dateOrderError(d: TripDates): string | null {
  if (d.receivingStart && d.receivingStart > d.receivingEnd)
    return 'Receiving start must be before receiving end';
  if (d.receivingEnd > d.tripDate) return 'Receiving window must close before the trip date';
  if (d.tripDate > d.deliveryDate) return 'Delivery date must be after the trip date';
  return null;
}

export const FREE_TRIP_FIELDS = [
  'allowedCategoryIds',
  'availableWeightKg',
  'notes',
  'receivingAddress',
  'deliveryLocation',
  'feeUsd',
  'travelerCount',
] as const;

export const APPROVAL_DATE_FIELDS = ['receivingStart', 'receivingEnd', 'tripDate'] as const;

export interface TripEditClassification {
  free: Record<string, unknown>;
  approvalDates: Record<string, unknown>; // needs a ChangeRequest on an active trip
  deliveryDate?: unknown; // direct only while no accepted deals
}

export function classifyTripEdit(input: Record<string, unknown>): TripEditClassification {
  const free: Record<string, unknown> = {};
  const approvalDates: Record<string, unknown> = {};
  for (const key of FREE_TRIP_FIELDS) if (input[key] !== undefined) free[key] = input[key];
  for (const key of APPROVAL_DATE_FIELDS)
    if (input[key] !== undefined) approvalDates[key] = input[key];
  return {
    free,
    approvalDates,
    ...(input.deliveryDate !== undefined ? { deliveryDate: input.deliveryDate } : {}),
  };
}
