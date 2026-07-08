/**
 * Money limits (docs/02 §4): per-transaction min 500 EGP (~$10) / max 50,000 EGP
 * (~$1,000), admin-editable via SystemSetting 'money.limits'.
 */

export interface MoneyLimits {
  USD: { minMinor: number; maxMinor: number };
  EGP: { minMinor: number; maxMinor: number };
}

export const DEFAULT_LIMITS: MoneyLimits = {
  USD: { minMinor: 1_000, maxMinor: 100_000 }, // $10 – $1,000
  EGP: { minMinor: 50_000, maxMinor: 5_000_000 }, // 500 – 50,000 EGP
};

export function limitError(
  limits: MoneyLimits,
  currency: 'USD' | 'EGP',
  amountMinor: number,
): string | null {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) return 'Amount must be positive';
  const { minMinor, maxMinor } = limits[currency];
  if (amountMinor < minMinor) return `Minimum is ${minMinor / 100} ${currency}`;
  if (amountMinor > maxMinor) return `Maximum is ${maxMinor / 100} ${currency}`;
  return null;
}
