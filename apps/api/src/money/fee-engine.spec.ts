import { describe, expect, it } from 'vitest';
import { escrowAmountMinor, feeForDeal, feeForItem, reconcileVariable } from './fee-engine';

/**
 * The worked examples approved in docs/02 §4:
 * F=$5, W=$3/kg, C=1.2 (USA→Egypt), T: electronics 1.5 / clothes 1.0, B=1.3.
 */
const PARAMS = {
  basketMultiplier: 1.3,
  weightUsdPerKgMinor: 300,
  floorFeeMinor: 500,
  countryMultiplier: 1.2,
};

const ELECTRONICS_2KG = { typeMultiplier: 1.5, volumetricWeightKg: 2, count: 1 };
const CLOTHES_1_5KG = { typeMultiplier: 1.0, volumetricWeightKg: 1.5, count: 1 };

describe('feeForItem — docs/02 worked examples', () => {
  it('Box electronics 2kg → $10.80', () => {
    expect(feeForItem('BOX', PARAMS, ELECTRONICS_2KG)).toBe(1080);
  });
  it('Box clothes 1.5kg → $5.40', () => {
    expect(feeForItem('BOX', PARAMS, CLOTHES_1_5KG)).toBe(540);
  });
  it('Basket electronics 2kg → $14.04 (B=1.3)', () => {
    expect(feeForItem('BASKET', PARAMS, ELECTRONICS_2KG)).toBe(1404);
  });
  it('Basket clothes 1.5kg → $7.02', () => {
    expect(feeForItem('BASKET', PARAMS, CLOTHES_1_5KG)).toBe(702);
  });
  it('count multiplies the line', () => {
    expect(feeForItem('BOX', PARAMS, { ...ELECTRONICS_2KG, count: 3 })).toBe(3240);
  });
});

describe('feeForDeal — docs/02 worked examples', () => {
  it('Box deal → $21.20 (5 + 10.80 + 5.40)', () => {
    const fee = feeForDeal('BOX', PARAMS, [ELECTRONICS_2KG, CLOTHES_1_5KG]);
    expect(fee.totalMinor).toBe(2120);
    expect(fee.itemFeesMinor).toEqual([1080, 540]);
  });
  it('Basket deal → $26.06 (5 + 14.04 + 7.02)', () => {
    expect(feeForDeal('BASKET', PARAMS, [ELECTRONICS_2KG, CLOTHES_1_5KG]).totalMinor).toBe(2606);
  });
  it('empty deal = floor fee only', () => {
    expect(feeForDeal('BOX', PARAMS, []).totalMinor).toBe(500);
  });
});

describe('escrowAmountMinor — decision L2 pricing modes', () => {
  const items = [
    { declaredValueUsd: 15000, count: 1 },
    { declaredValueUsd: 2500, count: 2 },
  ];
  it('Box escrows the fee only (mode irrelevant)', () => {
    expect(escrowAmountMinor('BOX', null, 2120, items)).toBe(2120);
  });
  it('VARIABLE basket escrows fee + declared estimate ($200 example → $226.06)', () => {
    expect(
      escrowAmountMinor('BASKET', 'VARIABLE', 2606, [{ declaredValueUsd: 20000, count: 1 }]),
    ).toBe(22606);
  });
  it('VARIABLE sums declared values × count; nulls count as zero', () => {
    expect(escrowAmountMinor('BASKET', 'VARIABLE', 1000, items)).toBe(1000 + 15000 + 5000);
    expect(escrowAmountMinor('BASKET', 'VARIABLE', 1000, [{ declaredValueUsd: null, count: 5 }])).toBe(1000);
  });
  it('FIXED basket escrows the all-inclusive agreed amount only', () => {
    expect(escrowAmountMinor('BASKET', 'FIXED', 25000, items)).toBe(25000);
  });
});

describe('reconcileVariable — the approved top-up/refund flow', () => {
  it('actual $215 on a $200 estimate (fee $26.06): shopper tops up $15, traveler gets $241.06', () => {
    const r = reconcileVariable(22606, 2606, 21500);
    expect(r.finalTotalMinor).toBe(24106);
    expect(r.deltaMinor).toBe(1500);
  });
  it('actual $190: $10 refunds to the shopper, traveler gets $216.06', () => {
    const r = reconcileVariable(22606, 2606, 19000);
    expect(r.finalTotalMinor).toBe(21606);
    expect(r.deltaMinor).toBe(-1000);
  });
  it('actual equals estimate → zero delta', () => {
    expect(reconcileVariable(22606, 2606, 20000).deltaMinor).toBe(0);
  });
});
