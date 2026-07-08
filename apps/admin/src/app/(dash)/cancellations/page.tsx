'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, Card } from '@sindbad/ui';
import { api } from '@/lib/api';

interface CancellationRequest {
  id: string;
  reason: string;
  createdAt: string;
  deal: {
    id: string;
    status: string;
    ongoingStep: string | null;
    feeUsd: number;
    travelerAccount: { displayName: string };
    shopperAccount: { displayName: string };
    tripMission: { origin: { nameEn: string }; destination: { nameEn: string } };
  };
}

export default function CancellationsPage() {
  const [requests, setRequests] = useState<CancellationRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<CancellationRequest[]>('/admin/cancellations')
      .then(setRequests)
      .catch(() => setRequests([]));
  }, []);
  useEffect(load, [load]);

  async function decide(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    try {
      await api(`/admin/cancellations/${id}/${action}`, { body: {} });
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Cancellation requests</h1>
        <p className="text-sm text-slate">
          Shopper cancellations at Ordered-or-later — approving executes the cancellation and
          (from Phase 3) the refund.
        </p>
      </div>

      {requests === null ? (
        <Card className="p-8 text-center text-sm text-slate">Loading…</Card>
      ) : requests.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate">No pending cancellations.</Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-display text-sm font-semibold">
                  {r.deal.tripMission.origin.nameEn}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-light" />
                  {r.deal.tripMission.destination.nameEn}
                  <span className="text-xs font-normal text-slate">
                    · {r.deal.travelerAccount.displayName} ⇄ {r.deal.shopperAccount.displayName} ·
                    ${(r.deal.feeUsd / 100).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-slate">
                  Status {r.deal.status}
                  {r.deal.ongoingStep ? ` (${r.deal.ongoingStep})` : ''} ·{' '}
                  {new Date(r.createdAt).toLocaleString('en-GB')}
                </div>
                <div className="rounded-button bg-offwhite px-3 py-2 text-sm">“{r.reason}”</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, 'approve')}>
                  Approve cancel
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, 'reject')}
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
