/**
 * The fee engine — pure functions, integer minor units (docs/02 §4, approved).
 *
 *   Fee/item = B × T × (W × volumetricWeightKg) × C      (× item count)
 *   Fee/deal = F + Σ item fees
 *
 * B basket multiplier (Box = 1) · T category multiplier · W USD/kg ·
 * C = originPriceParam × destinationPriceParam · F floor fee.
 */

export interface FeeParams {
  basketMultiplier: number; // B (applied only to BASKET)
  weightUsdPerKgMinor: number; // W in minor units
  floorFeeMinor: number; // F in minor units
  countryMultiplier: number; // C (origin × destination)
}

export interface FeeItemInput {
  typeMultiplier: number; // T
  volumetricWeightKg: number;
  count: number;
}

/** Per-item fee in minor units, rounded half-up per item line. */
export function feeForItem(
  kind: 'BOX' | 'BASKET',
  params: FeeParams,
  item: FeeItemInput,
): number {
  const b = kind === 'BASKET' ? params.basketMultiplier : 1;
  const raw =
    b *
    item.typeMultiplier *
    (params.weightUsdPerKgMinor * item.volumetricWeightKg) *
    params.countryMultiplier *
    item.count;
  return Math.round(raw);
}

export function feeForDeal(
  kind: 'BOX' | 'BASKET',
  params: FeeParams,
  items: FeeItemInput[],
): { itemFeesMinor: number[]; floorFeeMinor: number; totalMinor: number } {
  const itemFeesMinor = items.map((i) => feeForItem(kind, params, i));
  const totalMinor = params.floorFeeMinor + itemFeesMinor.reduce((a, b) => a + b, 0);
  return { itemFeesMinor, floorFeeMinor: params.floorFeeMinor, totalMinor };
}

/**
 * Escrow amount on acceptance (docs/02 §4): Box = fee; Basket = fee + product
 * price (declared values; the Variable-price estimate reconciles at completion).
 */
export function escrowAmountMinor(
  kind: 'BOX' | 'BASKET',
  feeMinor: number,
  items: Array<{ declaredValueUsd: number | null; count: number }>,
): number {
  if (kind === 'BOX') return feeMinor;
  const price = items.reduce((sum, i) => sum + (i.declaredValueUsd ?? 0) * i.count, 0);
  return feeMinor + price;
}
