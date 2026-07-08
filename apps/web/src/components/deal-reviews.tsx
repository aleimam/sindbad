'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';
import { Button, Card, Input, cn } from '@sindbad/ui';
import { api, ApiError } from '@/lib/api';

interface Review {
  id: string;
  authorAccountId: string;
  targetAccountId: string;
  stars: number;
  comment: string | null;
  status: 'PENDING' | 'REVEALED';
  response: string | null;
  createdAt: string;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Review section on a completed deal — the +12h/+12d blind window. */
export function DealReviews({
  dealId,
  completedAt,
  myAccountId,
}: {
  dealId: string;
  completedAt: string;
  myAccountId: string;
}) {
  const t = useTranslations();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Review[]>(`/deals/${dealId}/reviews`).then(setReviews).catch(() => setReviews([]));
  }, [dealId]);
  useEffect(load, [load]);

  const now = Date.now();
  const opensAt = new Date(completedAt).getTime() + 12 * HOUR;
  const closesAt = new Date(completedAt).getTime() + 12 * DAY;
  const windowOpen = now >= opensAt && now <= closesAt;

  const mine = reviews?.find((r) => r.authorAccountId === myAccountId);
  const theirs = reviews?.find((r) => r.targetAccountId === myAccountId && r.status === 'REVEALED');

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api(`/deals/${dealId}/reviews`, { body: { stars, comment: comment || undefined } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  async function respond(reviewId: string) {
    if (!response.trim()) return;
    await api(`/reviews/${reviewId}/response`, { body: { text: response } }).catch(() => undefined);
    setResponse('');
    load();
  }

  if (reviews === null) return null;

  return (
    <Card className="space-y-3 p-4">
      <h2 className="font-display text-sm font-semibold">{t('review.title')}</h2>

      {!mine && now < opensAt ? (
        <p className="text-xs text-slate">{t('review.locked')}</p>
      ) : null}

      {!mine && windowOpen ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setStars(s)} aria-label={`${s} stars`}>
                <Star
                  className={cn('h-6 w-6', s <= stars ? 'fill-amber text-amber' : 'text-slate-border')}
                />
              </button>
            ))}
          </div>
          <Input
            placeholder={t('review.commentPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {error ? <p className="text-xs text-error">{error}</p> : null}
          <Button size="sm" disabled={busy || stars === 0} onClick={submit}>
            {t('review.submit')}
          </Button>
        </div>
      ) : null}

      {mine ? (
        <div className="space-y-1">
          <div className="text-[11px] text-slate">{t('review.yours')}</div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn('h-3.5 w-3.5', s <= mine.stars ? 'fill-amber text-amber' : 'text-slate-border')}
              />
            ))}
            {mine.status === 'PENDING' ? (
              <span className="ms-2 text-[11px] text-slate-light">{t('review.blindNote')}</span>
            ) : null}
          </div>
          {mine.comment ? <p className="text-sm">{mine.comment}</p> : null}
        </div>
      ) : null}

      {theirs ? (
        <div className="space-y-2 border-t border-slate-border pt-3 dark:border-slate-dark">
          <div className="text-[11px] text-slate">{t('review.theirs')}</div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn('h-3.5 w-3.5', s <= theirs.stars ? 'fill-amber text-amber' : 'text-slate-border')}
              />
            ))}
          </div>
          {theirs.comment ? <p className="text-sm">{theirs.comment}</p> : null}
          {theirs.response ? (
            <p className="rounded-button bg-offwhite p-2 text-xs dark:bg-slate-dark/40">↳ {theirs.response}</p>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder={t('review.respondPlaceholder')}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
              <Button size="sm" variant="secondary" onClick={() => respond(theirs.id)}>
                {t('review.respond')}
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
