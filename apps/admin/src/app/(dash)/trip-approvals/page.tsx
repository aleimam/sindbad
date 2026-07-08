'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, Card } from '@sindbad/ui';
import { api } from '@/lib/api';

interface PendingTrip {
  id: string;
  createdAt: string;
  origin: { nameEn: string };
  destination: { nameEn: string };
  account: { displayName: string; type: string };
  trip: {
    receivingStart: string | null;
    receivingEnd: string;
    tripDate: string;
    deliveryDate: string;
    deliveryLocation: string;
    availableWeightKg: number;
    travelerCount: number;
  };
}

const d = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-GB') : 'open');

export default function TripApprovalsPage() {
  const [trips, setTrips] = useState<PendingTrip[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<PendingTrip[]>('/admin/trips/pending').then(setTrips).catch(() => setTrips([]));
  }, []);
  useEffect(load, [load]);

  async function decide(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    try {
      await api(`/admin/trips/${id}/${action}`, { body: {} });
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Trip approvals</h1>
        <p className="text-sm text-slate">
          Verify flight details &amp; passport, then approve. (Document uploads land with the media
          module.)
        </p>
      </div>

      {trips === null ? (
        <Card className="p-8 text-center text-sm text-slate">Loading…</Card>
      ) : trips.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate">No trips waiting for approval.</Card>
      ) : (
        <div className="space-y-3">
          {trips.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-display text-sm font-semibold">
                  {t.origin.nameEn} <ArrowRight className="h-3.5 w-3.5 text-slate-light" />{' '}
                  {t.destination.nameEn}
                  <span className="text-xs font-normal text-slate">
                    · {t.account.displayName} ({t.account.type})
                  </span>
                </div>
                <div className="text-xs text-slate">
                  Receiving {d(t.trip.receivingStart)} – {d(t.trip.receivingEnd)} · Trip{' '}
                  {d(t.trip.tripDate)} · Delivery {d(t.trip.deliveryDate)} @{' '}
                  {t.trip.deliveryLocation} · {t.trip.availableWeightKg} kg ·{' '}
                  {t.trip.travelerCount} traveler(s)
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === t.id} onClick={() => decide(t.id, 'approve')}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="border-error text-error hover:bg-error/5"
                  disabled={busy === t.id}
                  onClick={() => decide(t.id, 'reject')}
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
