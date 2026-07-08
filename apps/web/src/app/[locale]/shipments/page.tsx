'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Button, Card, cn } from '@sindbad/ui';
import { Link } from '@/i18n/navigation';
import { useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';
import { MissionCard } from '@/components/mission-card';
import type { Mission } from '@/lib/types';

export default function ShipmentsPage() {
  const t = useTranslations();
  const { me } = useMe();
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');

  const browse = useApiGet<Mission[]>('/shipments');
  const mine = useApiGet<Mission[]>(me ? '/shipments/mine' : null);
  const myShipments = (mine.data ?? []).filter((m) => m.kind === 'SHIPMENT');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{t('nav.shipments')}</h1>
        {me ? (
          <Link href="/shipments/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> {t('action.postShipment')}
            </Button>
          </Link>
        ) : null}
      </div>

      {me ? (
        <div className="flex gap-2">
          {(['browse', 'mine'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                'rounded-pill px-4 py-1.5 text-xs font-semibold',
                tab === k
                  ? 'bg-royal text-white'
                  : 'bg-white text-slate-dark dark:bg-slate-dark/40 dark:text-offwhite',
              )}
            >
              {t(`market.tab.${k}`)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {tab === 'browse' ? (
          browse.loading ? (
            <Card className="p-6 text-center text-sm text-slate">{t('market.loading')}</Card>
          ) : (browse.data ?? []).length === 0 ? (
            <Card className="p-6 text-center text-sm text-slate">{t('market.noShipments')}</Card>
          ) : (
            browse.data!.map((m) => <MissionCard key={m.id} mission={m} />)
          )
        ) : myShipments.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate">{t('market.noMine')}</Card>
        ) : (
          myShipments.map((m) => <MissionCard key={m.id} mission={m} showStatus />)
        )}
      </div>
    </div>
  );
}
