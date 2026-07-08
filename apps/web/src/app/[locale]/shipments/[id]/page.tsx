'use client';

import { use, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Package, ShoppingBasket } from 'lucide-react';
import { Avatar, Button, Card, CategoryChip, StatusPill } from '@sindbad/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError, mediaUrl } from '@/lib/api';
import { fmtUsd, usdToCents } from '@/lib/format';
import { localizedName, useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';
import { PhotoUploader } from '@/components/photo-uploader';
import type { MatchEntry, Mission } from '@/lib/types';

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { me } = useMe();

  const shipment = useApiGet<Mission>(`/shipments/${id}`);
  const refreshShipment = shipment.refresh;
  const matches = useApiGet<MatchEntry[]>(me ? `/shipments/${id}/matches` : null);
  const myMissions = useApiGet<Mission[]>(me ? '/shipments/mine' : null);

  const [tripPick, setTripPick] = useState('');
  const [feeOffer, setFeeOffer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const m = shipment.data;
  if (shipment.loading || !m)
    return <Card className="p-6 text-center text-sm text-slate">{t('market.loading')}</Card>;

  const isOwner = Boolean(m.isOwner);
  const myAccountId = me?.memberships[0]?.account.id;
  const myTrips = (myMissions.data ?? []).filter((x) => x.kind === 'TRIP' && x.status === 'ACTIVE');
  const Icon = m.shipment?.type === 'BASKET' ? ShoppingBasket : Package;
  const totalWeight = m.shipment?.items.reduce((s, i) => s + i.volumetricWeightKg * i.count, 0);

  async function requestDeal() {
    setError(null);
    setBusy(true);
    try {
      const deal = await api<{ id: string }>('/deals', {
        body: {
          tripMissionId: tripPick,
          shipmentMissionId: id,
          feeUsd: feeOffer ? usdToCents(feeOffer) : undefined,
          paymentMethod: 'CASH',
        },
      });
      router.push(`/deals/${deal.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5 text-center">
        <div className="flex items-center justify-center gap-3 font-display text-lg font-bold">
          {localizedName(m.origin, locale)}
          <Icon className="h-5 w-5 text-teal" />
          {localizedName(m.destination, locale)}
        </div>
        <div className="flex justify-center gap-2">
          <StatusPill variant="ongoing">{t(`market.type.${m.shipment?.type ?? 'BOX'}`)}</StatusPill>
          <StatusPill variant={m.status === 'ACTIVE' ? 'completed' : 'negotiating'}>
            {t(`market.status.${m.status}`)}
          </StatusPill>
        </div>
      </Card>

      <Link href={`/users/${m.account.id}`} className="block">
        <Card className="flex items-center gap-3 p-4 transition-colors hover:border-royal">
          <Avatar name={m.account.displayName} />
          <div className="text-sm font-semibold">{m.account.displayName}</div>
        </Card>
      </Link>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">
          {t('market.itemsTitle')} ({m.shipment?.items.length}) · {totalWeight?.toFixed(1)}{' '}
          {t('market.kg')}
        </h2>
        {m.shipment?.items.map((it) => (
          <Card key={it.id} className="space-y-1.5 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{it.details}</span>
              <span className="text-xs text-slate">
                ×{it.count} · {it.volumetricWeightKg} {t('market.kg')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              {it.category ? (
                <CategoryChip>{localizedName(it.category, locale)}</CategoryChip>
              ) : (
                <span />
              )}
              {it.declaredValueUsd ? (
                <span className="text-xs text-slate">{fmtUsd(it.declaredValueUsd)}</span>
              ) : null}
            </div>
            {it.photos?.length || isOwner ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(it.photos ?? []).map((photoId) => (
                  <a
                    key={photoId}
                    href={mediaUrl(photoId, 'md')}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(photoId, 'thumb')}
                      alt=""
                      className="h-14 w-14 rounded-button border border-slate-border object-cover"
                    />
                  </a>
                ))}
                {isOwner ? (
                  <PhotoUploader context="ITEM_PHOTO" subjectId={it.id} onDone={refreshShipment} />
                ) : null}
              </div>
            ) : null}
          </Card>
        ))}
      </div>

      <Card className="flex items-center justify-between bg-tint-blue p-4 dark:bg-royal/15">
        <div>
          <div className="text-[11px] text-royal">{t('market.askingFee')}</div>
          <div className="font-display text-lg font-bold">{fmtUsd(m.shipment?.feeUsd)}</div>
        </div>
        <span className="text-[11px] text-slate">{t('market.negotiable')}</span>
      </Card>

      {isOwner && matches.data?.length ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">
            {t('home.matches')} ({matches.data.length})
          </h2>
          {matches.data.map(({ mission, askFlagged }) => (
            <Card key={mission.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium">{mission.account.displayName}</div>
                <div className="text-xs text-slate">
                  {t('market.receivingUntil')}{' '}
                  {mission.trip ? new Date(mission.trip.receivingEnd).toLocaleDateString('en-GB') : ''}
                  {askFlagged ? ` · ${t('market.askFlagged')}` : ''}
                </div>
              </div>
              <span className="text-sm font-semibold">{fmtUsd(mission.trip?.feeUsd)}</span>
            </Card>
          ))}
        </div>
      ) : null}

      {me && !isOwner && myAccountId !== m.account.id && m.status === 'ACTIVE' ? (
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">{t('market.carryThisShipment')}</h2>
          {myTrips.length === 0 ? (
            <p className="text-xs text-slate">{t('market.needTrip')}</p>
          ) : (
            <>
              <select
                value={tripPick}
                onChange={(e) => setTripPick(e.target.value)}
                className="w-full rounded-button border border-slate-border bg-white px-3.5 py-2.5 text-sm dark:border-slate-dark dark:bg-navy"
              >
                <option value="">{t('market.pickTrip')}</option>
                {myTrips.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {localizedName(tr.origin, locale)} → {localizedName(tr.destination, locale)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder={t('market.feeOfferPlaceholder')}
                value={feeOffer}
                onChange={(e) => setFeeOffer(e.target.value)}
                className="w-full rounded-button border border-slate-border bg-white px-3.5 py-2.5 text-sm dark:border-slate-dark dark:bg-navy"
              />
              {error ? <p className="text-xs text-error">{error}</p> : null}
              <Button className="w-full" disabled={busy || !tripPick} onClick={requestDeal}>
                {t('action.request')}
              </Button>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}
