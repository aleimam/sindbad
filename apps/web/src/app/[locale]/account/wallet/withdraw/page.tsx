'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Input, StatusPill, cn } from '@sindbad/ui';
import { api, ApiError } from '@/lib/api';
import { fmtAmount, toMinor } from '@/lib/format';
import { useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';
import { Field } from '@/components/field';

interface BankAccount {
  id: string;
  holderName: string;
  bankName: string;
  accountNumber: string;
  country: string;
}

interface Withdrawal {
  id: string;
  currency: 'USD' | 'EGP';
  amountMinor: number;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  createdAt: string;
  bankAccount: BankAccount;
}

export default function WithdrawPage() {
  const t = useTranslations();
  const { me } = useMe();
  const banks = useApiGet<BankAccount[]>(me ? '/wallet/bank-accounts' : null);
  const withdrawals = useApiGet<Withdrawal[]>(me ? '/wallet/withdrawals' : null);

  const [showAddBank, setShowAddBank] = useState(false);
  const [bank, setBank] = useState({
    holderName: '',
    country: '',
    bankName: '',
    accountNumber: '',
    iban: '',
    swift: '',
  });
  const [bankAccountId, setBankAccountId] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EGP'>('EGP');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addBank(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/wallet/bank-accounts', {
        body: {
          ...bank,
          iban: bank.iban || undefined,
          swift: bank.swift || undefined,
        },
      });
      setShowAddBank(false);
      banks.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountMinor = toMinor(amount);
    if (!amountMinor || !bankAccountId) return setError(t('auth.genericError'));
    setBusy(true);
    try {
      await api('/wallet/withdrawals', { body: { bankAccountId, currency, amountMinor } });
      setAmount('');
      withdrawals.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  if (me === null)
    return (
      <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>
    );

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-bold">{t('wallet.withdraw')}</h1>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('wallet.bankAccounts')}</h2>
          <Button size="sm" variant="ghost" onClick={() => setShowAddBank((s) => !s)}>
            {t('wallet.addBank')}
          </Button>
        </div>
        {(banks.data ?? []).map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBankAccountId(b.id)}
            className={cn(
              'w-full rounded-button border p-3 text-start text-xs',
              bankAccountId === b.id
                ? 'border-royal bg-tint-blue dark:bg-royal/15'
                : 'border-slate-border dark:border-slate-dark',
            )}
          >
            <div className="font-semibold">{b.bankName}</div>
            <div className="text-slate" dir="ltr">
              {b.holderName} · {b.accountNumber} · {b.country}
            </div>
          </button>
        ))}
        {showAddBank ? (
          <form onSubmit={addBank} className="space-y-2.5 border-t border-slate-border pt-3 dark:border-slate-dark">
            <Input placeholder={t('wallet.holderName')} value={bank.holderName} onChange={(e) => setBank({ ...bank, holderName: e.target.value })} required />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={t('wallet.bankName')} value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} required />
              <Input placeholder={t('wallet.country')} value={bank.country} onChange={(e) => setBank({ ...bank, country: e.target.value })} required />
            </div>
            <Input placeholder={t('wallet.accountNumber')} dir="ltr" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} required />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="IBAN" dir="ltr" value={bank.iban} onChange={(e) => setBank({ ...bank, iban: e.target.value })} />
              <Input placeholder="SWIFT" dir="ltr" value={bank.swift} onChange={(e) => setBank({ ...bank, swift: e.target.value })} />
            </div>
            <Button type="submit" size="sm" disabled={busy} className="w-full">
              {t('wallet.saveBank')}
            </Button>
          </form>
        ) : null}
      </Card>

      <Card className="p-5">
        <form onSubmit={request} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('wallet.currency')}>
              <div className="flex gap-2">
                {(['EGP', 'USD'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={cn(
                      'flex-1 rounded-button border px-3 py-2 text-sm font-semibold',
                      currency === c
                        ? 'border-royal bg-royal text-white'
                        : 'border-slate-border bg-white dark:border-slate-dark dark:bg-navy',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('wallet.amount')}>
              <Input type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
          </div>
          <p className="text-[11px] text-slate-light">{t('wallet.holdNote')}</p>
          {error ? <p className="text-xs text-error">{error}</p> : null}
          <Button type="submit" disabled={busy || !bankAccountId} className="w-full">
            {t('wallet.requestWithdrawal')}
          </Button>
        </form>
      </Card>

      <section className="space-y-2.5">
        <h2 className="font-display text-base font-semibold">{t('wallet.myWithdrawals')}</h2>
        {(withdrawals.data ?? []).map((wd) => (
          <Card key={wd.id} className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm font-semibold">{fmtAmount(wd.amountMinor, wd.currency)}</div>
              <div className="text-[11px] text-slate">{wd.bankAccount.bankName}</div>
            </div>
            <StatusPill
              variant={
                wd.status === 'PAID' ? 'completed' : wd.status === 'REJECTED' ? 'cancelled' : 'ongoing'
              }
            >
              {t(`wallet.withdrawalStatus.${wd.status}`)}
            </StatusPill>
          </Card>
        ))}
      </section>
    </div>
  );
}
