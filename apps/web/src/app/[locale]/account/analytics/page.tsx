'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MetricCard } from '@sindbad/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/use-me';

interface Perf {
  trips: number;
  shipments: number;
  dealsAsTraveler: number;
  dealsAsShopper: number;
  completedDeals: number;
}

export default function MyAnalyticsPage() {
  const t = useTranslations();
  const { me } = useMe();
  const [data, setData] = useState<Perf | null>(null);

  useEffect(() => {
    if (me) api<Perf>('/analytics/me').then(setData).catch(() => setData(null));
  }, [me]);

  if (me === undefined) return null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">{t('analytics.title')}</h1>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label={t('analytics.trips')} value={data ? String(data.trips) : '—'} />
        <MetricCard label={t('analytics.shipments')} value={data ? String(data.shipments) : '—'} />
        <MetricCard
          label={t('analytics.dealsAsTraveler')}
          value={data ? String(data.dealsAsTraveler) : '—'}
        />
        <MetricCard
          label={t('analytics.dealsAsShopper')}
          value={data ? String(data.dealsAsShopper) : '—'}
        />
        <MetricCard label={t('analytics.completed')} value={data ? String(data.completedDeals) : '—'} />
      </div>
    </div>
  );
}
