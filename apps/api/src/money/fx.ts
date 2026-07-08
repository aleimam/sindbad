/**
 * FX math — pure (docs/02 §4). An EGP balance may pay a USD obligation at the
 * daily rate + admin spread; the spread books to platform revenue (0 at launch).
 */

export interface FxQuote {
  egpBaseMinor: number; // EGP covering the USD amount at the raw rate
  egpSpreadMinor: number; // the platform's FX margin
  egpTotalMinor: number; // what the wallet is debited
}

/** EGP needed (minor units) to buy `usdMinor` at `usdToEgp`, plus spreadPct on top. */
export function egpForUsd(usdMinor: number, usdToEgp: number, spreadPct: number): FxQuote {
  if (usdMinor <= 0) throw new Error('usdMinor must be positive');
  if (usdToEgp <= 0) throw new Error('rate must be positive');
  const egpBaseMinor = Math.ceil(usdMinor * usdToEgp);
  const egpSpreadMinor = Math.round(egpBaseMinor * (spreadPct / 100));
  return { egpBaseMinor, egpSpreadMinor, egpTotalMinor: egpBaseMinor + egpSpreadMinor };
}
