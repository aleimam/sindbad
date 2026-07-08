'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Input, StatusPill, cn } from '@sindbad/ui';
import { api, ApiError } from '@/lib/api';
import { fmtAmount, toMinor } from '@/lib/format';
import { useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';
import { Field } from '@/components/field';

interface Deposit {
  id: string;
  currency: 'USD' | 'EGP';
  amountMinor: number;
  method: string;
  referenceCode: string;
  status: 'REQUESTED' | 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED';
  createdAt: string;
}

const STATUS_VARIANT = {
  REQUESTED: 'negotiating',
  PENDING_REVIEW: 'ongoing',
  CONFIRMED: 'completed',
  REJECTED: 'cancelled',
} as const;

export default function DepositPage() {
  const t = useTranslations();
  const { me } = useMe();
  const deposits = useApiGet<Deposit[]>(me ? '/wallet/deposits' : null);

  const [currency, setCurrency] = useState<'USD' | 'EGP'>('EGP');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'INSTAPAY' | 'BANK_TRANSFER'>('INSTAPAY');
  const [refInputs, setRefInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountMinor = toMinor(amount);
    if (!amountMinor) return setError(t('auth.genericError'));
    setBusy(true);
    try {
      await api('/wallet/deposits', { body: { currency, amountMinor, method } });
      setAmount('');
      deposits.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  async function submitRef(id: string) {
    const userReference = refInputs[id]?.trim();
    if (!userReference) return;
    await api(`/wallet/deposits/${id}/submit`, { body: { userReference } }).catch(() => undefined);
    deposits.refresh();
  }

  if (me === null)
    return (
      <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>
    );

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-bold">{t('wallet.deposit')}</h1>

      <Card className="p-5">
        <form onSubmit={create} className="space-y-4">
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
              <Input
                type="number"
                step="0.01"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
          </div>
          <Field label={t('wallet.method')}>
            <div className="flex gap-2">
              {(['INSTAPAY', 'BANK_TRANSFER'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    'flex-1 rounded-button border px-3 py-2 text-sm font-semibold',
                    method === m
                      ? 'border-royal bg-royal text-white'
                      : 'border-slate-border bg-white dark:border-slate-dark dark:bg-navy',
                  )}
                >
                  {t(`wallet.methods.${m}`)}
                </button>
              ))}
            </div>
          </Field>
          {error ? <p className="text-xs text-error">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {t('wallet.startDeposit')}
          </Button>
        </form>
      </Card>

      <section className="space-y-2.5">
        <h2 className="font-display text-base font-semibold">{t('wallet.myDeposits')}</h2>
        {(deposits.data ?? []).map((d) => (
          <Card key={d.id} className="space-y-2.5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{fmtAmount(d.amountMinor, d.currency)}</span>
              <StatusPill variant={STATUS_VARIANT[d.status]}>
                {t(`wallet.depositStatus.${d.status}`)}
              </StatusPill>
            </div>
            <div className="rounded-button bg-tint-blue p-3 text-xs dark:bg-royal/15">
              {t('wallet.referenceHint')}:{' '}
              <span className="font-mono font-bold">{d.referenceCode}</span>
            </div>
            {d.status === 'REQUESTED' ? (
              <div className="flex gap-2">
                <Input
                  placeholder={t('wallet.yourReference')}
                  value={refInputs[d.id] ?? ''}
                  onChange={(e) => setRefInputs((s) => ({ ...s, [d.id]: e.target.value }))}
                />
                <Button size="sm" onClick={() => submitRef(d.id)}>
                  {t('wallet.submitRef')}
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </section>
    </div>
  );
}
