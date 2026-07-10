'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, MetricCard } from '@sindbad/ui';
import { api } from '@/lib/api';

interface Overview {
  users: number;
  accounts: number;
  activeMissions: number;
  ongoingDeals: number;
  completedDeals: number;
  escrowHeldUsd: number;
  queues: { pendingVerifications: number; openComplaints: number };
  dealsByStatus: Record<string, number>;
}

const usd = (m: number) => `$${(m / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<Overview>('/admin/analytics/overview').then(setData).catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate">Live platform KPIs across users, marketplace, and money.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Users" value={data ? String(data.users) : '—'} hint="total registered" />
        <MetricCard
          label="Active missions"
          value={data ? String(data.activeMissions) : '—'}
          hint="trips + shipments"
        />
        <MetricCard
          label="Ongoing deals"
          value={data ? String(data.ongoingDeals) : '—'}
          hint="agreed, not completed"
        />
        <MetricCard
          label="Escrow held"
          value={data ? usd(data.escrowHeldUsd) : '—'}
          hint="USD, all deals"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-display text-sm font-bold">Queues</h2>
          <div className="space-y-2 text-sm">
            <Link
              href="/complaints"
              className="flex items-center justify-between rounded-button px-3 py-2 hover:bg-cloud"
            >
              <span>Open complaints</span>
              <span className="font-semibold text-royal">{data?.queues.openComplaints ?? '—'}</span>
            </Link>
            <div className="flex items-center justify-between rounded-button px-3 py-2">
              <span>Pending verifications</span>
              <span className="font-semibold">{data?.queues.pendingVerifications ?? '—'}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-sm font-bold">Deals by status</h2>
          {data ? (
            <div className="space-y-1.5 text-sm">
              {Object.entries(data.dealsByStatus).length === 0 ? (
                <p className="text-slate">No deals yet.</p>
              ) : (
                Object.entries(data.dealsByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-slate">{status.replaceAll('_', ' ').toLowerCase()}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-sm text-slate">{error ? 'Failed to load.' : 'Loading…'}</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Accounts"
          value={data ? String(data.accounts) : '—'}
          hint="personal + business"
        />
        <MetricCard
          label="Completed deals"
          value={data ? String(data.completedDeals) : '—'}
          hint="settled"
        />
      </div>
    </div>
  );
}
