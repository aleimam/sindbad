'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@sindbad/ui';
import { api } from '@/lib/api';

interface ModerationAction {
  id: string;
  kind: string;
  points: number | null;
  reason: string;
  createdAt: string;
}
interface Complaint {
  id: string;
  raisedByAccountId: string;
  targetType: 'REQUEST' | 'DEAL' | 'CHAT' | 'REVIEW';
  targetId: string;
  topic: string;
  details: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  decision: string | null;
  createdAt: string;
  actions: ModerationAction[];
}

type Kind = 'DEDUCT_CREDIBILITY' | 'HOLD_MEMBERSHIP' | 'BLOCK';

export default function ComplaintsPage() {
  const [items, setItems] = useState<Complaint[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [panel, setPanel] = useState<Complaint | null>(null);

  const load = useCallback(() => {
    api<Complaint[]>('/admin/complaints').then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  async function setStatus(id: string, status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED', decision?: string) {
    setBusy(id);
    try {
      await api(`/admin/complaints/${id}/status`, { method: 'PATCH', body: { status, decision } });
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Complaints</h1>
        <p className="text-sm text-slate">
          Review reports against requests, deals, chats, and reviews. Resolve, dismiss, or apply a
          moderation action.
        </p>
      </div>

      {items === null ? (
        <Card className="p-8 text-center text-sm text-slate">Loading…</Card>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate">No open complaints.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <Card key={c.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-semibold uppercase text-navy">
                      {c.targetType}
                    </span>
                    <span className="font-semibold">{c.topic}</span>
                    {c.status === 'UNDER_REVIEW' && (
                      <span className="text-[11px] font-medium text-amber">under review</span>
                    )}
                  </div>
                  <p className="max-w-2xl text-sm text-slate">{c.details}</p>
                  <div className="text-[11px] text-slate-light" dir="ltr">
                    target {c.targetId} · from {c.raisedByAccountId} ·{' '}
                    {new Date(c.createdAt).toLocaleString('en-GB')}
                  </div>
                  {c.actions.length > 0 && (
                    <div className="text-[11px] text-teal">
                      {c.actions.map((a) => a.kind.replaceAll('_', ' ').toLowerCase()).join(', ')} applied
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.status === 'NEW' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === c.id}
                      onClick={() => setStatus(c.id, 'UNDER_REVIEW')}
                    >
                      Start review
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setPanel(c)}>
                    Moderation…
                  </Button>
                  <Button size="sm" disabled={busy === c.id} onClick={() => setStatus(c.id, 'RESOLVED')}>
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === c.id}
                    onClick={() => setStatus(c.id, 'DISMISSED')}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {panel && (
        <ModerationDialog
          complaint={panel}
          onClose={() => setPanel(null)}
          onDone={() => {
            setPanel(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ModerationDialog({
  complaint,
  onClose,
  onDone,
}: {
  complaint: Complaint;
  onClose: () => void;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<Kind>('DEDUCT_CREDIBILITY');
  const [points, setPoints] = useState(10);
  const [holdDays, setHoldDays] = useState(7);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      await api('/admin/moderation-actions', {
        body: {
          complaintId: complaint.id,
          accountId: complaint.raisedByAccountId,
          kind,
          points: kind === 'DEDUCT_CREDIBILITY' ? points : undefined,
          holdDays: kind === 'HOLD_MEMBERSHIP' ? holdDays : undefined,
          reason,
        },
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <div>
          <h2 className="font-display text-lg font-bold">Apply moderation</h2>
          <p className="text-xs text-slate">
            Against the account that raised “{complaint.topic}”. This is a punishment, not a target of
            the complaint — pick the offending account deliberately.
          </p>
        </div>

        <div className="space-y-2">
          {(['DEDUCT_CREDIBILITY', 'HOLD_MEMBERSHIP', 'BLOCK'] as Kind[]).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="radio" checked={kind === k} onChange={() => setKind(k)} />
              {k === 'DEDUCT_CREDIBILITY'
                ? 'Deduct credibility points'
                : k === 'HOLD_MEMBERSHIP'
                  ? 'Hold membership (temporary suspension)'
                  : 'Block account (ongoing deals only)'}
            </label>
          ))}
        </div>

        {kind === 'DEDUCT_CREDIBILITY' && (
          <label className="block text-sm">
            Points to deduct
            <input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="mt-1 w-full rounded-button border border-slate-border px-3 py-2"
            />
          </label>
        )}
        {kind === 'HOLD_MEMBERSHIP' && (
          <label className="block text-sm">
            Hold duration (days)
            <input
              type="number"
              min={1}
              value={holdDays}
              onChange={(e) => setHoldDays(Number(e.target.value))}
              className="mt-1 w-full rounded-button border border-slate-border px-3 py-2"
            />
          </label>
        )}

        <label className="block text-sm">
          Reason (shown in the audit trail)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-button border border-slate-border px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={apply} disabled={busy || reason.trim().length < 3}>
            {busy ? 'Applying…' : 'Apply'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
