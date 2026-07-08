'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@sindbad/ui';
import { api } from '@/lib/api';

interface Withdrawal {
  id: string;
  accountId: string;
  currency: 'USD' | 'EGP';
  amountMinor: number;
  createdAt: string;
  bankAccount: {
    holderName: string;
    bankName: string;
    accountNumber: string;
    iban: string | null;
    swift: string | null;
    country: string;
  };
}

const amt = (m: number, c: string) => `${(m / 100).toFixed(2)} ${c}`;

export default function WithdrawalsQueuePage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Withdrawal[]>('/admin/finance/withdrawals')
      .then(setWithdrawals)
      .catch(() => setWithdrawals([]));
  }, []);
  useEffect(load, [load]);

  async function decide(id: string, action: 'paid' | 'reject') {
    setBusy(id);
    try {
      await api(`/admin/finance/withdrawals/${id}/${action}`, { body: {} });
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Withdrawals</h1>
        <p className="text-sm text-slate">
          Funds are already held. Execute the bank transfer, then mark paid — or reject to release
          the hold.
        </p>
      </div>

      {withdrawals === null ? (
        <Card className="p-8 text-center text-sm text-slate">Loading…</Card>
      ) : withdrawals.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate">No pending withdrawals.</Card>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((wd) => (
            <Card key={wd.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="space-y-1 text-sm">
                <div className="font-semibold">{amt(wd.amountMinor, wd.currency)}</div>
                <div className="text-xs text-slate" dir="ltr">
                  {wd.bankAccount.holderName} · {wd.bankAccount.bankName} ·{' '}
                  {wd.bankAccount.accountNumber}
                  {wd.bankAccount.iban ? ` · IBAN ${wd.bankAccount.iban}` : ''}
                  {wd.bankAccount.swift ? ` · SWIFT ${wd.bankAccount.swift}` : ''} ·{' '}
                  {wd.bankAccount.country}
                </div>
                <div className="text-[11px] text-slate-light">
                  {new Date(wd.createdAt).toLocaleString('en-GB')}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === wd.id} onClick={() => decide(wd.id, 'paid')}>
                  Mark paid
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === wd.id}
                  onClick={() => decide(wd.id, 'reject')}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
