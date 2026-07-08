import { describe, expect, it } from 'vitest';
import { validateEntries, walletDeltas, type EntryDraft } from './ledger';

const w = (walletId: string, currency: 'USD' | 'EGP', amountMinor: number): EntryDraft => ({
  walletId,
  currency,
  amountMinor,
});
const sys = (
  systemAccount: EntryDraft['systemAccount'],
  currency: 'USD' | 'EGP',
  amountMinor: number,
): EntryDraft => ({ systemAccount, currency, amountMinor });

describe('validateEntries — double-entry invariants', () => {
  it('accepts a balanced escrow funding', () => {
    expect(validateEntries([w('w1', 'USD', -2120), sys('ESCROW', 'USD', 2120)])).toBeNull();
  });

  it('rejects unbalanced transactions', () => {
    expect(validateEntries([w('w1', 'USD', -2120), sys('ESCROW', 'USD', 2000)])).toContain(
      'Unbalanced',
    );
  });

  it('balances per currency independently (FX legs)', () => {
    const fx = [
      w('w1', 'EGP', -108120),
      sys('FX', 'EGP', 108120),
      sys('FX', 'USD', -2120),
      sys('ESCROW', 'USD', 2120),
    ];
    expect(validateEntries(fx)).toBeNull();
    // Same set with a broken USD side fails:
    expect(validateEntries([...fx.slice(0, 3), sys('ESCROW', 'USD', 2000)])).toContain('USD');
  });

  it('rejects floats, zeros, single legs, and double-account legs', () => {
    expect(validateEntries([w('w1', 'USD', -10.5), sys('ESCROW', 'USD', 10.5)])).toContain(
      'integer',
    );
    expect(validateEntries([w('w1', 'USD', 0), sys('ESCROW', 'USD', 0)])).toContain('Zero');
    expect(validateEntries([w('w1', 'USD', -5)])).toContain('two legs');
    expect(
      validateEntries([
        { walletId: 'w1', systemAccount: 'ESCROW', currency: 'USD', amountMinor: -5 },
        sys('COMPANY_BANK', 'USD', 5),
      ]),
    ).toContain('exactly one');
  });
});

describe('walletDeltas', () => {
  it('nets multiple legs per wallet+currency and ignores system legs', () => {
    const deltas = walletDeltas([
      w('w1', 'USD', -500),
      w('w1', 'USD', -200),
      w('w2', 'USD', 700),
      sys('ESCROW', 'USD', 0o0 + 0), // system legs ignored regardless
    ]);
    expect(deltas).toContainEqual({ walletId: 'w1', currency: 'USD', deltaMinor: -700 });
    expect(deltas).toContainEqual({ walletId: 'w2', currency: 'USD', deltaMinor: 700 });
    expect(deltas).toHaveLength(2);
  });
});
