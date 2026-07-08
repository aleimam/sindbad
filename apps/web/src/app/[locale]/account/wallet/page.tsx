'use client';

import { useTranslations } from 'next-intl';
import { ArrowDownToLine, ArrowUpFromLine, Send } from 'lucide-react';
import { Button, Card } from '@sindbad/ui';
import { Link } from '@/i18n/navigation';
import { fmtAmount } from '@/lib/format';
import { useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';

interface WalletData {
  walletId: string;
  balances: { USD: number; EGP: number };
}

interface Entry {
  id: string;
  type: string;
  currency: 'USD' | 'EGP';
  amountMinor: number;
  note: string | null;
  dealId: string | null;
  createdAt: string;
}

export default function WalletPage() {
  const t = useTranslations();
  const { me } = useMe();
  const wallet = useApiGet<WalletData>(me ? '/wallet' : null);
  const txs = useApiGet<Entry[]>(me ? '/wallet/transactions' : null);

  if (me === null)
    return (
      <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>
    );

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-bold">{t('wallet.title')}</h1>

      <div className="grid grid-cols-2 gap-3">
        {(['USD', 'EGP'] as const).map((currency) => (
          <Card key={currency} className="p-4">
            <div className="text-xs text-slate">{currency}</div>
            <div className="mt-1 font-display text-2xl font-bold">
              {wallet.data ? fmtAmount(wallet.data.balances[currency], currency) : '—'}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/account/wallet/deposit">
          <Button variant="ghost" className="w-full">
            <ArrowDownToLine className="h-4 w-4" /> {t('wallet.deposit')}
          </Button>
        </Link>
        <Link href="/account/wallet/withdraw">
          <Button variant="ghost" className="w-full">
            <ArrowUpFromLine className="h-4 w-4" /> {t('wallet.withdraw')}
          </Button>
        </Link>
        <Link href="/account/wallet/send">
          <Button variant="ghost" className="w-full">
            <Send className="h-4 w-4" /> {t('wallet.send')}
          </Button>
        </Link>
      </div>

      <section className="space-y-2.5">
        <h2 className="font-display text-base font-semibold">{t('wallet.transactions')}</h2>
        {!txs.data?.length ? (
          <Card className="p-6 text-center text-sm text-slate">{t('wallet.noTransactions')}</Card>
        ) : (
          <Card className="divide-y divide-slate-border overflow-hidden dark:divide-slate-dark">
            {txs.data.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-xs font-medium">{t(`wallet.tx.${e.type}`)}</div>
                  <div className="text-[11px] text-slate-light">
                    {new Date(e.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <span
                  className={
                    e.amountMinor >= 0
                      ? 'text-sm font-semibold text-teal'
                      : 'text-sm font-semibold text-navy dark:text-offwhite'
                  }
                >
                  {e.amountMinor >= 0 ? '+' : ''}
                  {fmtAmount(e.amountMinor, e.currency)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
