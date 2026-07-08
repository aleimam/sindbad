'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Box } from 'lucide-react';
import { Card, StatusPill, cn, dealStatusVariant } from '@sindbad/ui';
import { Link } from '@/i18n/navigation';
import { fmtUsd } from '@/lib/format';
import { localizedName, useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';
import type { Deal } from '@/lib/types';

const GROUPS = {
  requests: ['REQUESTED', 'NEGOTIATING'],
  ongoing: ['ONGOING', 'ARRIVED_DESTINATION', 'READY_FOR_PICKUP'],
  completed: ['COMPLETED'],
  cancelled: ['CANCELLED'],
} as const;

export default function DealsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { me } = useMe();
  const [tab, setTab] = useState<keyof typeof GROUPS>('requests');

  const deals = useApiGet<Deal[]>(me ? '/deals/mine' : null);
  const myAccountId = me?.memberships[0]?.account.id;

  if (me === null)
    return (
      <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>
    );

  const filtered = (deals.data ?? []).filter((d) =>
    (GROUPS[tab] as readonly string[]).includes(d.status),
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">{t('nav.deals')}</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(GROUPS) as Array<keyof typeof GROUPS>).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              'whitespace-nowrap rounded-pill px-4 py-1.5 text-xs font-semibold',
              tab === k
                ? 'bg-royal text-white'
                : 'bg-white text-slate-dark dark:bg-slate-dark/40 dark:text-offwhite',
            )}
          >
            {t(`deal.group.${k}`)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {deals.loading ? (
          <Card className="p-6 text-center text-sm text-slate">{t('market.loading')}</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate">{t('deal.none')}</Card>
        ) : (
          filtered.map((d) => {
            const other =
              d.travelerAccountId === myAccountId ? d.shopperAccount : d.travelerAccount;
            return (
              <Link key={d.id} href={`/deals/${d.id}`} className="block">
                <Card className="space-y-2.5 p-4 transition-colors hover:border-royal">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Box className="h-4 w-4 text-royal" />
                      {localizedName(d.tripMission.origin, locale)}
                      <ArrowRight className="h-3.5 w-3.5 text-slate-light rtl:rotate-180" />
                      {localizedName(d.tripMission.destination, locale)}
                    </div>
                    <StatusPill variant={dealStatusVariant(d.status)}>
                      {t(`deal.status.${d.status}`)}
                    </StatusPill>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate">
                    <span>
                      {t('deal.with')} {other.displayName} ·{' '}
                      {t(`market.type.${d.shipmentMission.shipment?.type ?? 'BOX'}`)}
                    </span>
                    <span className="font-semibold text-navy dark:text-offwhite">
                      {fmtUsd(d.feeUsd)}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
