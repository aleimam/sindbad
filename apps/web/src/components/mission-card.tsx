'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Package, Plane, ShoppingBasket } from 'lucide-react';
import { Avatar, Card, StatusPill, TierBadge } from '@sindbad/ui';
import { Link } from '@/i18n/navigation';
import { fmtDate, fmtUsd } from '@/lib/format';
import { localizedName } from '@/lib/use-api';
import type { Mission } from '@/lib/types';

const STATUS_VARIANT: Record<string, 'negotiating' | 'ongoing' | 'completed' | 'cancelled'> = {
  PENDING_APPROVAL: 'negotiating',
  ACTIVE: 'completed',
  REJECTED: 'cancelled',
  EXPIRED: 'cancelled',
  CLOSED: 'cancelled',
  DRAFT: 'negotiating',
};

export function MissionCard({ mission, showStatus }: { mission: Mission; showStatus?: boolean }) {
  const locale = useLocale();
  const t = useTranslations();
  const isTrip = mission.kind === 'TRIP';
  const href = isTrip ? `/trips/${mission.id}` : `/shipments/${mission.id}`;
  const Icon = isTrip ? Plane : mission.shipment?.type === 'BASKET' ? ShoppingBasket : Package;
  const fee = isTrip ? mission.trip?.feeUsd : mission.shipment?.feeUsd;
  const totalWeight = mission.shipment?.items.reduce(
    (s, i) => s + i.volumetricWeightKg * i.count,
    0,
  );

  return (
    <Link href={href} className="block">
      <Card className="space-y-3 p-4 transition-colors hover:border-royal">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <Icon className="h-4 w-4 text-royal" />
            {localizedName(mission.origin, locale)}
            <ArrowRight className="h-3.5 w-3.5 text-slate-light rtl:rotate-180" />
            {localizedName(mission.destination, locale)}
          </div>
          {showStatus ? (
            <StatusPill variant={STATUS_VARIANT[mission.status] ?? 'negotiating'}>
              {t(`market.status.${mission.status}`)}
            </StatusPill>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-xs text-slate">
          {isTrip && mission.trip ? (
            <>
              <span>
                {t('market.receivingUntil')} {fmtDate(mission.trip.receivingEnd)}
              </span>
              <span>
                {mission.trip.availableWeightKg} {t('market.kgFree')}
              </span>
            </>
          ) : mission.shipment ? (
            <>
              <span>
                {mission.shipment.items.length} {t('market.items')} ·{' '}
                {t(`market.type.${mission.shipment.type}`)}
              </span>
              <span>
                {totalWeight?.toFixed(1)} {t('market.kg')}
              </span>
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-slate-border pt-3 dark:border-slate-dark">
          <div className="flex items-center gap-2">
            <Avatar name={mission.account.displayName} className="h-6 w-6 text-[10px]" />
            <span className="text-xs font-medium">{mission.account.displayName}</span>
            {mission.account.credibilityTier ? (
              <TierBadge
                tier={mission.account.credibilityTier}
                score={mission.account.credibilityScore}
                className="px-1.5 py-0.5 text-[10px]"
              />
            ) : null}
          </div>
          <span className="text-sm font-semibold text-navy dark:text-offwhite">{fmtUsd(fee)}</span>
        </div>
      </Card>
    </Link>
  );
}
