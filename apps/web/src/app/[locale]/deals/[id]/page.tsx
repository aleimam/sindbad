'use client';

import { use, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Check, Clock, Lock, Plane } from 'lucide-react';
import { Avatar, Button, Card, Input, StatusPill, cn, dealStatusVariant } from '@sindbad/ui';
import { Link } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import { fmtUsd, usdToCents } from '@/lib/format';
import { localizedName, useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';
import { DealReviews } from '@/components/deal-reviews';
import { ReportButton } from '@/components/report-dialog';
import type { Deal } from '@/lib/types';

const BOX_STEPS = ['ORDERED', 'SHIPPED', 'DELIVERED_TO_TRAVELER', 'RECEIVED_BY_TRAVELER'] as const;
const BASKET_STEPS = ['ORDERED', 'SHIPPED', 'RECEIVED_BY_TRAVELER'] as const;
const STEP_ACTOR: Record<string, Record<string, 'TRAVELER' | 'SHOPPER'>> = {
  BOX: {
    ORDERED: 'SHOPPER',
    SHIPPED: 'SHOPPER',
    DELIVERED_TO_TRAVELER: 'SHOPPER',
    RECEIVED_BY_TRAVELER: 'TRAVELER',
  },
  BASKET: { ORDERED: 'TRAVELER', SHIPPED: 'TRAVELER', RECEIVED_BY_TRAVELER: 'TRAVELER' },
};

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const { me } = useMe();

  const { data: deal, loading, refresh } = useApiGet<Deal>(me ? `/deals/${id}` : null);
  const [counter, setCounter] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (me === null)
    return (
      <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>
    );
  if (loading || !deal)
    return <Card className="p-6 text-center text-sm text-slate">{t('market.loading')}</Card>;

  const myAccountId = me?.memberships[0]?.account.id;
  const myRole = deal.travelerAccountId === myAccountId ? 'TRAVELER' : 'SHOPPER';
  const kind = deal.shipmentMission.shipment?.type ?? 'BOX';
  const steps = kind === 'BASKET' ? BASKET_STEPS : BOX_STEPS;
  const inNegotiation = deal.status === 'REQUESTED' || deal.status === 'NEGOTIATING';
  const canAcceptNow = inNegotiation && deal.lastOfferByAccountId !== myAccountId;

  const currentIdx = deal.ongoingStep ? steps.indexOf(deal.ongoingStep as never) : -1;
  const nextStepName =
    deal.status === 'ONGOING' && currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
  const nextActor = nextStepName ? STEP_ACTOR[kind]![nextStepName] : null;

  async function act(path: string, body: unknown = {}) {
    setBusy(true);
    setError(null);
    try {
      await api(path, { body });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  const cancelNeedsReason =
    myRole === 'SHOPPER' && (deal.status !== 'ONGOING' || deal.ongoingStep !== null) && !inNegotiation;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-base font-bold">
            <Plane className="h-4 w-4 text-royal" />
            {localizedName(deal.tripMission.origin, locale)}
            <ArrowRight className="h-3.5 w-3.5 text-slate-light rtl:rotate-180" />
            {localizedName(deal.tripMission.destination, locale)}
          </div>
          <StatusPill variant={dealStatusVariant(deal.status)}>
            {t(`deal.status.${deal.status}`)}
          </StatusPill>
        </div>

        <div className="flex items-center justify-between border-y border-slate-border py-3 dark:border-slate-dark">
          <Link href={`/users/${deal.travelerAccountId}`} className="flex items-center gap-2">
            <Avatar name={deal.travelerAccount.displayName} className="h-7 w-7 text-[10px]" />
            <div className="text-xs">
              <div className="font-medium">
                {deal.travelerAccount.displayName}
                {myRole === 'TRAVELER' ? ` (${t('deal.you')})` : ''}
              </div>
              <div className="text-slate">{t('deal.traveler')}</div>
            </div>
          </Link>
          <Link href={`/users/${deal.shopperAccountId}`} className="flex items-center gap-2">
            <div className="text-end text-xs">
              <div className="font-medium">
                {deal.shopperAccount.displayName}
                {myRole === 'SHOPPER' ? ` (${t('deal.you')})` : ''}
              </div>
              <div className="text-slate">{t('deal.shopper')}</div>
            </div>
            <Avatar name={deal.shopperAccount.displayName} className="h-7 w-7 bg-slate text-[10px]" />
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate">{t('deal.agreedFee')}</span>
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-bold">{fmtUsd(deal.feeUsd)}</span>
            <StatusPill variant="completed">
              <Lock className="h-3 w-3" /> {t(`deal.pay.${deal.paymentMethod}`)}
            </StatusPill>
          </div>
        </div>

        {deal.tripMission.trip?.receivingAddress ? (
          <div className="rounded-button bg-tint-blue p-3 text-xs dark:bg-royal/15">
            <div className="font-semibold text-royal">{t('market.receivingAddress')}</div>
            <div className="mt-0.5">{deal.tripMission.trip.receivingAddress}</div>
          </div>
        ) : null}
      </Card>

      {!inNegotiation && deal.status !== 'CANCELLED' ? (
        <Card className="space-y-0 p-5">
          <h2 className="mb-3 font-display text-sm font-semibold">{t('deal.progress')}</h2>
          {steps.map((s, i) => {
            const done = currentIdx >= i;
            const isNext = nextStepName === s;
            return (
              <div key={s} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full',
                      done
                        ? 'bg-teal text-white'
                        : isNext
                          ? 'bg-royal text-white'
                          : 'border-2 border-slate-border bg-white dark:bg-navy',
                    )}
                  >
                    {done ? (
                      <Check className="h-3 w-3" />
                    ) : isNext ? (
                      <Clock className="h-3 w-3" />
                    ) : null}
                  </div>
                  {i < steps.length - 1 ? (
                    <div className={cn('my-0.5 min-h-5 w-0.5 flex-1', done ? 'bg-teal' : 'bg-slate-border')} />
                  ) : null}
                </div>
                <div className="pb-4">
                  <div
                    className={cn(
                      'text-xs font-semibold',
                      isNext ? 'text-royal' : done ? '' : 'text-slate-light',
                    )}
                  >
                    {t(`deal.step.${s}`)}
                  </div>
                  {isNext && nextActor === myRole ? (
                    <div className="text-[11px] font-medium text-slate">{t('deal.yourTurn')}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {['ARRIVED_DESTINATION', 'READY_FOR_PICKUP', 'COMPLETED'].includes(deal.status) ? (
            <p className="text-xs font-medium text-teal">{t(`deal.status.${deal.status}`)} ✓</p>
          ) : null}
        </Card>
      ) : null}

      {deal.events?.length ? (
        <Card className="space-y-2 p-4">
          <h2 className="text-xs font-semibold text-slate">{t('deal.history')}</h2>
          {deal.events.map((e) => (
            <div key={e.id} className="flex justify-between text-[11px]">
              <span>{t(`deal.event.${e.type}`)}</span>
              <span className="text-slate-light">
                {new Date(e.createdAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      {deal.status === 'COMPLETED' && deal.completedAt && myAccountId ? (
        <DealReviews dealId={deal.id} completedAt={deal.completedAt} myAccountId={myAccountId} />
      ) : null}

      {error ? <p className="text-xs text-error">{error}</p> : null}

      <div className="space-y-2.5">
        {inNegotiation ? (
          <>
            {canAcceptNow ? (
              <Button className="w-full" disabled={busy} onClick={() => act(`/deals/${id}/accept`)}>
                {t('deal.accept')} · {fmtUsd(deal.feeUsd)}
              </Button>
            ) : (
              <p className="text-center text-xs text-slate">{t('deal.waitingOther')}</p>
            )}
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder={t('deal.counterPlaceholder')}
                value={counter}
                onChange={(e) => setCounter(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={busy || !counter}
                onClick={() => act(`/deals/${id}/fee`, { feeUsd: usdToCents(counter) })}
              >
                {t('deal.counter')}
              </Button>
            </div>
          </>
        ) : null}

        {deal.status === 'ONGOING' && nextStepName && nextActor === myRole ? (
          <Button className="w-full" disabled={busy} onClick={() => act(`/deals/${id}/advance`)}>
            {t('deal.mark')} {t(`deal.step.${nextStepName}`)}
          </Button>
        ) : null}

        {deal.status === 'READY_FOR_PICKUP' && myRole === 'SHOPPER' ? (
          <Button className="w-full" disabled={busy} onClick={() => act(`/deals/${id}/complete`)}>
            {t('deal.complete')}
          </Button>
        ) : null}

        {!['COMPLETED', 'CANCELLED'].includes(deal.status) &&
        (inNegotiation || myRole === 'SHOPPER') ? (
          <div className="space-y-2">
            {cancelNeedsReason ? (
              <Input
                placeholder={t('deal.cancelReason')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            ) : null}
            <Button
              variant="ghost"
              className="w-full text-error"
              disabled={busy || (cancelNeedsReason && !reason.trim())}
              onClick={() => act(`/deals/${id}/cancel`, { reason: reason || undefined })}
            >
              {t('deal.cancel')}
            </Button>
          </div>
        ) : null}

        <div className="flex justify-center pt-1">
          <ReportButton targetType="DEAL" targetId={deal.id} />
        </div>
      </div>
    </div>
  );
}
