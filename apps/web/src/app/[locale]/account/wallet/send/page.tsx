'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Input, cn } from '@sindbad/ui';
import { useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import { toMinor } from '@/lib/format';
import { useMe } from '@/lib/use-me';
import { Field } from '@/components/field';

export default function SendMoneyPage() {
  const t = useTranslations();
  const router = useRouter();
  const { me } = useMe();

  const [recipient, setRecipient] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EGP'>('EGP');
  const [amount, setAmount] = useState('');
  const [transferId, setTransferId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function initiate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountMinor = toMinor(amount);
    if (!amountMinor) return setError(t('auth.genericError'));
    setBusy(true);
    try {
      const res = await api<{ transferId: string; devCode?: string }>(
        '/wallet/transfer/initiate',
        { body: { recipient: recipient.trim(), currency, amountMinor } },
      );
      setTransferId(res.transferId);
      setDevCode(res.devCode ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/wallet/transfer/confirm', { body: { transferId, code } });
      router.push('/account/wallet');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
      setBusy(false);
    }
  }

  if (me === null)
    return (
      <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>
    );

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-bold">{t('wallet.send')}</h1>

      {!transferId ? (
        <Card className="p-5">
          <form onSubmit={initiate} className="space-y-4">
            <Field label={t('wallet.recipient')} hint={t('wallet.recipientHint')}>
              <Input dir="ltr" value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
            </Field>
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
            {error ? <p className="text-xs text-error">{error}</p> : null}
            <Button type="submit" disabled={busy} className="w-full">
              {t('wallet.continue')}
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-5">
          <form onSubmit={confirm} className="space-y-4">
            <p className="text-sm text-slate">{t('wallet.otpHint')}</p>
            <Input
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              className="text-center text-lg tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            {devCode ? (
              <p className="rounded-button bg-tint-blue px-3 py-2 text-center text-xs text-royal dark:bg-royal/15">
                {t('auth.devCodeHint')}: <span className="font-mono font-semibold">{devCode}</span>
              </p>
            ) : null}
            {error ? <p className="text-xs text-error">{error}</p> : null}
            <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
              {t('wallet.confirmSend')}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
