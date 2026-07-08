'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, MetricCard } from '@sindbad/ui';
import { api } from '@/lib/api';

interface FxStatus {
  latest: { usdToEgp: number; day: string; source: string } | null;
  spreadPct: number;
}

export default function FxPage() {
  const [status, setStatus] = useState<FxStatus | null>(null);
  const [rate, setRate] = useState('');
  const [spread, setSpread] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<FxStatus>('/admin/finance/fx').then(setStatus).catch(() => setStatus(null));
  }, []);
  useEffect(load, [load]);

  async function saveRate() {
    setBusy(true);
    try {
      await api('/admin/finance/fx/rate', { method: 'PUT', body: { usdToEgp: Number(rate) } });
      setRate('');
      load();
    } finally {
      setBusy(false);
    }
  }

  async function saveSpread() {
    setBusy(true);
    try {
      await api('/admin/finance/fx/spread', { method: 'PUT', body: { spreadPct: Number(spread) } });
      setSpread('');
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">FX rates</h1>
        <p className="text-sm text-slate">
          Daily USD→EGP rate (auto-fetched 6:00 UTC) + the platform spread applied when an EGP
          balance pays a USD obligation.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard
          label="USD → EGP"
          value={status?.latest ? status.latest.usdToEgp.toFixed(2) : '—'}
          hint={status?.latest ? `${status.latest.source} · ${new Date(status.latest.day).toLocaleDateString('en-GB')}` : 'no rate yet'}
        />
        <MetricCard label="Spread" value={status ? `${status.spreadPct}%` : '—'} hint="0% at launch" />
      </div>

      <Card className="space-y-3 p-5">
        <div className="text-sm font-semibold">Manual rate override (today)</div>
        <div className="flex gap-2">
          <Input type="number" step="0.01" min={0} placeholder="e.g. 50.25" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Button size="sm" disabled={busy || !rate} onClick={saveRate}>
            Set rate
          </Button>
        </div>
        <div className="text-sm font-semibold">Spread %</div>
        <div className="flex gap-2">
          <Input type="number" step="0.1" min={0} max={20} placeholder="e.g. 2" value={spread} onChange={(e) => setSpread(e.target.value)} />
          <Button size="sm" disabled={busy || spread === ''} onClick={saveSpread}>
            Set spread
          </Button>
        </div>
      </Card>
    </div>
  );
}
