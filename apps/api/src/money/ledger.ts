/**
 * Ledger invariants — pure validation (docs/02 §4).
 * Every transaction's entries must sum to zero per currency (double entry),
 * with integer non-zero amounts and exactly one account per leg.
 */

export interface EntryDraft {
  walletId?: string;
  systemAccount?:
    | 'ESCROW'
    | 'GATEWAY_CLEARING'
    | 'COMPANY_BANK'
    | 'WITHDRAWALS_PAYABLE'
    | 'PLATFORM_REVENUE'
    | 'FX';
  currency: 'USD' | 'EGP';
  amountMinor: number;
}

export function validateEntries(entries: EntryDraft[]): string | null {
  if (entries.length < 2) return 'A transaction needs at least two legs';
  const sums = new Map<string, number>();
  for (const e of entries) {
    if (!Number.isInteger(e.amountMinor)) return 'Amounts must be integer minor units';
    if (e.amountMinor === 0) return 'Zero-amount legs are not allowed';
    const hasWallet = Boolean(e.walletId);
    const hasSystem = Boolean(e.systemAccount);
    if (hasWallet === hasSystem) return 'Each leg needs exactly one of walletId / systemAccount';
    sums.set(e.currency, (sums.get(e.currency) ?? 0) + e.amountMinor);
  }
  for (const [currency, sum] of sums) {
    if (sum !== 0) return `Unbalanced transaction: ${currency} sums to ${sum}`;
  }
  return null;
}

/** Net effect per wallet+currency — used to apply balance deltas and check for negatives. */
export function walletDeltas(entries: EntryDraft[]): Array<{
  walletId: string;
  currency: 'USD' | 'EGP';
  deltaMinor: number;
}> {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (!e.walletId) continue;
    const key = `${e.walletId}:${e.currency}`;
    map.set(key, (map.get(key) ?? 0) + e.amountMinor);
  }
  return [...map.entries()].map(([key, deltaMinor]) => {
    const [walletId, currency] = key.split(':') as [string, 'USD' | 'EGP'];
    return { walletId, currency, deltaMinor };
  });
}
