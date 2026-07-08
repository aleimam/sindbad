'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@sindbad/ui';
import { api } from '@/lib/api';

interface Deposit {
  id: string;
  accountId: string;
  currency: 'USD' | 'EGP';
  amountMinor: number;
  method: string;
  referenceCode: string;
  userReference: string | null;
  createdAt: string;
}

const amt = (m: number, c: string) => `${(m / 100).toFixed(2)} ${c}`;

export default function DepositsQueuePage() {
  const [deposits, setDeposits] = useState<Deposit[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Deposit[]>('/admin/finance/deposits').then(setDeposits).catch(() => setDeposits([]));
  }, []);
  useEffect(load, [load]);

  async function decide(id: string, action: 'confirm' | 'reject') {
    setBusy(id);
    try {
      await api(`/admin/finance/deposits/${id}/${action}`, { body: {} });
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Deposits</h1>
        <p className="text-sm text-slate">
          Match the user&apos;s reference against the bank statement, then confirm to credit the
          wallet.
        </p>
      </div>

      {deposits === null ? (
        <Card className="p-8 text-center text-sm text-slate">Loading…</Card>
      ) : deposits.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate">No deposits awaiting review.</Card>
      ) : (
        <div className="space-y-3">
          {deposits.map((d) => (
            <Card key={d.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="space-y-1 text-sm">
                <div className="font-semibold">
                  {amt(d.amountMinor, d.currency)} · {d.method}
                </div>
                <div className="text-xs text-slate">
                  Our ref <span className="font-mono font-semibold">{d.referenceCode}</span> · User
                  ref <span className="font-mono font-semibold">{d.userReference}</span>
                </div>
                <div className="text-[11px] text-slate-light">
                  {new Date(d.createdAt).toLocaleString('en-GB')} · account {d.accountId}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === d.id} onClick={() => decide(d.id, 'confirm')}>
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === d.id}
                  onClick={() => decide(d.id, 'reject')}
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
