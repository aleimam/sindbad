'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, Card } from '@sindbad/ui';
import { api } from '@/lib/api';

interface ChangeRequest {
  id: string;
  subjectType: string;
  subjectId: string;
  before: Record<string, string | null>;
  after: Record<string, string | null>;
  createdAt: string;
}

const LABELS: Record<string, string> = {
  receivingStart: 'Receiving start',
  receivingEnd: 'Receiving end',
  tripDate: 'Trip date',
};

const d = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-GB') : 'open');

export default function EditApprovalsPage() {
  const [requests, setRequests] = useState<ChangeRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<ChangeRequest[]>('/admin/change-requests?status=PENDING')
      .then(setRequests)
      .catch(() => setRequests([]));
  }, []);
  useEffect(load, [load]);

  async function decide(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    try {
      await api(`/admin/change-requests/${id}/${action}`, { body: {} });
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Edit approvals</h1>
        <p className="text-sm text-slate">
          Date changes on approved trips — exactly what changed, before → after.
        </p>
      </div>

      {requests === null ? (
        <Card className="p-8 text-center text-sm text-slate">Loading…</Card>
      ) : requests.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate">No pending edit requests.</Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate">
                  {r.subjectType} · {new Date(r.createdAt).toLocaleString('en-GB')}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, 'approve')}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-error text-error hover:bg-error/5"
                    disabled={busy === r.id}
                    onClick={() => decide(r.id, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                {Object.keys(r.after).map((key) => {
                  const changed = r.before[key] !== r.after[key];
                  return (
                    <div key={key} className="flex items-center gap-3 text-sm">
                      <span className="w-32 text-xs text-slate">{LABELS[key] ?? key}</span>
                      <span className={changed ? 'text-slate line-through' : ''}>
                        {d(r.before[key])}
                      </span>
                      {changed ? (
                        <>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-light" />
                          <span className="font-semibold text-royal">{d(r.after[key])}</span>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
