'use client';

import { use, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Plane } from 'lucide-react';
import { Avatar, Button, Card, CategoryChip, StatusPill } from '@sindbad/ui';
import { useRouter } from '@/i18n/navigation';
import { api, ApiError, mediaUrl } from '@/lib/api';
import { fmtDate, fmtUsd, usdToCents } from '@/lib/format';
import { localizedName, useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';
import { PhotoUploader } from '@/components/photo-uploader';
import type { MatchEntry, Mission } from '@/lib/types';

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { me } = useMe();

  const trip = useApiGet<Mission>(`/trips/${id}`);
  const matches = useApiGet<MatchEntry[]>(me ? `/trips/${id}/matches` : null);
  const myMissions = useApiGet<Mission[]>(me ? '/shipments/mine' : null);

  const [feeOffer, setFeeOffer] = useState('');
  const [shipmentPick, setShipmentPick] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const m = trip.data;
  if (trip.loading || !m)
    return <Card className="p-6 text-center text-sm text-slate">{t('market.loading')}</Card>;

  const isOwner = Boolean(m.isOwner);
  const myAccountId = me?.memberships[0]?.account.id;
  const myShipments = (myMissions.data ?? []).filter(
    (x) => x.kind === 'SHIPMENT' && x.status === 'ACTIVE',
  );

  async function requestDeal() {
    setError(null);
    setBusy(true);
    try {
      const deal = await api<{ id: string }>('/deals', {
        body: {
          tripMissionId: id,
          shipmentMissionId: shipmentPick,
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

  async function tripAction(action: 'arrived' | 'ready') {
    setBusy(true);
    setError(null);
    try {
      await api(`/trips/${id}/${action}`, { body: {} });
      router.push('/deals');
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
          <Plane className="h-5 w-5 text-royal" />
          <ArrowRight className="hidden" />
          {localizedName(m.destination, locale)}
        </div>
        <div className="flex justify-center gap-2">
          <StatusPill variant={m.status === 'ACTIVE' ? 'completed' : 'negotiating'}>
            {t(`market.status.${m.status}`)}
          </StatusPill>
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-4">
        <Avatar name={m.account.displayName} />
        <div className="text-sm font-semibold">{m.account.displayName}</div>
      </Card>

      {m.trip ? (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3.5">
            <div className="text-[11px] text-slate">{t('market.receivingWindow')}</div>
            <div className="text-sm font-semibold">
              {m.trip.receivingStart ? fmtDate(m.trip.receivingStart) : t('market.openNow')} –{' '}
              {fmtDate(m.trip.receivingEnd)}
            </div>
          </Card>
          <Card className="p-3.5">
            <div className="text-[11px] text-slate">{t('market.deliveryDate')}</div>
            <div className="text-sm font-semibold">{fmtDate(m.trip.deliveryDate)}</div>
          </Card>
          <Card className="p-3.5">
            <div className="text-[11px] text-slate">{t('market.deliveryLocation')}</div>
            <div className="text-sm font-semibold">{m.trip.deliveryLocation}</div>
          </Card>
          <Card className="p-3.5">
            <div className="text-[11px] text-slate">{t('market.weightKg')}</div>
            <div className="text-sm font-semibold">{m.trip.availableWeightKg} kg</div>
          </Card>
        </div>
      ) : null}

      {m.trip?.allowedCategories?.length ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">{t('market.allowedCategories')}</h2>
          <div className="flex flex-wrap gap-2">
            {m.trip.allowedCategories.map((ac) =>
              ac.category ? (
                <CategoryChip key={ac.category.id}>
                  {localizedName(ac.category, locale)}
                </CategoryChip>
              ) : null,
            )}
          </div>
        </div>
      ) : null}

      {m.trip?.notes ? (
        <Card className="p-4 text-sm text-slate-dark dark:text-offwhite">“{m.trip.notes}”</Card>
      ) : null}

      <Card className="flex items-center justify-between bg-tint-blue p-4 dark:bg-royal/15">
        <div>
          <div className="text-[11px] text-royal">{t('market.askingFee')}</div>
          <div className="font-display text-lg font-bold">{fmtUsd(m.trip?.feeUsd)}</div>
        </div>
        <span className="text-[11px] text-slate">{t('market.negotiable')}</span>
      </Card>

      {isOwner ? (
        <div className="space-y-3">
          <Card className="space-y-2.5 p-4">
            <h2 className="text-sm font-semibold">{t('media.verificationDocs')}</h2>
            <p className="text-[11px] text-slate">{t('media.verificationHint')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {(trip.data?.verificationDocs ?? []).map((docId) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={docId}
                  src={mediaUrl(docId, 'thumb')}
                  crossOrigin="use-credentials"
                  alt=""
                  className="h-14 w-14 rounded-button border border-slate-border object-cover"
                />
              ))}
              <PhotoUploader
                context="TRIP_VERIFICATION"
                subjectId={id}
                onDone={() => trip.refresh()}
              />
            </div>
          </Card>
          {matches.data?.length ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">
                {t('home.matches')} ({matches.data.length})
              </h2>
              {matches.data.map(({ mission, askFlagged }) => (
                <Card key={mission.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-medium">{mission.account.displayName}</div>
                    <div className="text-xs text-slate">
                      {mission.shipment?.items.length} {t('market.items')}
                      {askFlagged ? ` · ${t('market.askFlagged')}` : ''}
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{fmtUsd(mission.shipment?.feeUsd)}</span>
                </Card>
              ))}
            </div>
          ) : null}
          {m.status === 'ACTIVE' ? (
            <div className="flex gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => tripAction('arrived')}>
                {t('deal.markArrived')}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => tripAction('ready')}>
                {t('deal.markReady')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : me && myAccountId !== m.account.id && m.status === 'ACTIVE' ? (
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">{t('market.requestThisTrip')}</h2>
          {myShipments.length === 0 ? (
            <p className="text-xs text-slate">{t('market.needShipment')}</p>
          ) : (
            <>
              <select
                value={shipmentPick}
                onChange={(e) => setShipmentPick(e.target.value)}
                className="w-full rounded-button border border-slate-border bg-white px-3.5 py-2.5 text-sm dark:border-slate-dark dark:bg-navy"
              >
                <option value="">{t('market.pickShipment')}</option>
                {myShipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {localizedName(s.origin, locale)} → {localizedName(s.destination, locale)} ·{' '}
                    {s.shipment?.items.length} {t('market.items')}
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
              <Button className="w-full" disabled={busy || !shipmentPick} onClick={requestDeal}>
                {t('action.request')}
              </Button>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}
