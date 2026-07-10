'use client';

import { use, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Heart, MessageCircle, Star, UserX } from 'lucide-react';
import { Avatar, Button, Card, TierBadge, cn } from '@sindbad/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import { localizedName } from '@/lib/use-api';
import { useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';

interface PublicProfile {
  id: string;
  displayName: string;
  type: 'PERSONAL' | 'COMMERCIAL';
  credibilityScore: number;
  credibilityTier: 'NEW' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  createdAt: string;
  activeMissions: Array<{
    id: string;
    kind: 'TRIP' | 'SHIPMENT';
    origin: { nameEn: string; nameAr: string };
    destination: { nameEn: string; nameAr: string };
    shipment: { type: string } | null;
  }>;
  reviews: Array<{
    id: string;
    stars: number;
    comment: string | null;
    response: string | null;
    createdAt: string;
  }>;
}

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const { me } = useMe();
  const router = useRouter();
  const { data: profile } = useApiGet<PublicProfile>(`/accounts/${id}/profile`);
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const myAccountId = me?.memberships[0]?.account.id;
  const isSelf = myAccountId === id;

  async function message() {
    setBusy(true);
    setChatError(null);
    try {
      const thread = await api<{ id: string }>('/chat/threads', { body: { accountId: id } });
      router.push(`/chat/${thread.id}`);
    } catch (err) {
      setChatError(err instanceof ApiError ? err.message : t('auth.genericError'));
      setBusy(false);
    }
  }

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <Card className="p-6 text-center text-sm text-slate">{t('market.loading')}</Card>;

  return (
    <div className="space-y-4">
      <Card className="flex flex-col items-center gap-2 p-6 text-center">
        <Avatar name={profile.displayName} className="h-14 w-14 text-lg" />
        <div className="font-display text-lg font-bold">{profile.displayName}</div>
        <TierBadge tier={profile.credibilityTier} score={profile.credibilityScore}>
          {t(`cred.tier.${profile.credibilityTier}`)} ·
        </TierBadge>
        <div className="text-[11px] text-slate">
          {profile.type} · {t('profile.memberSince')}{' '}
          {new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
        </div>
        {me && !isSelf ? (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button size="sm" disabled={busy} onClick={message}>
              <MessageCircle className="h-3.5 w-3.5" /> {t('profile.message')}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => api(`/favorites/${id}`, { body: {} }))}>
              <Heart className="h-3.5 w-3.5" /> {t('profile.favorite')}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => api(`/accounts/${id}/flag`, { method: 'PUT', body: { kind: 'FOLLOW' } }))}>
              {t('profile.follow')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-error"
              disabled={busy}
              onClick={() => act(() => api(`/accounts/${id}/flag`, { method: 'PUT', body: { kind: 'BLOCK' } }))}
            >
              <UserX className="h-3.5 w-3.5" /> {t('profile.block')}
            </Button>
          </div>
        ) : null}
        {chatError ? <p className="text-xs text-error">{chatError}</p> : null}
      </Card>

      {profile.activeMissions.length ? (
        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold">{t('profile.activeMissions')}</h2>
          {profile.activeMissions.map((m) => (
            <Link
              key={m.id}
              href={m.kind === 'TRIP' ? `/trips/${m.id}` : `/shipments/${m.id}`}
              className="block"
            >
              <Card className="flex items-center justify-between p-3.5 text-sm transition-colors hover:border-royal">
                <span className="flex items-center gap-2">
                  {localizedName(m.origin, locale)}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-light rtl:rotate-180" />
                  {localizedName(m.destination, locale)}
                </span>
                <span className="text-xs text-slate">
                  {m.kind === 'TRIP' ? t('nav.trips') : t(`market.type.${m.shipment?.type ?? 'BOX'}`)}
                </span>
              </Card>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-display text-base font-semibold">
          {t('profile.reviews')} ({profile.reviews.length})
        </h2>
        {profile.reviews.length === 0 ? (
          <Card className="p-5 text-center text-sm text-slate">{t('profile.noReviews')}</Card>
        ) : (
          profile.reviews.map((r) => (
            <Card key={r.id} className="space-y-1.5 p-4">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn('h-3.5 w-3.5', s <= r.stars ? 'fill-amber text-amber' : 'text-slate-border')}
                  />
                ))}
                <span className="ms-2 text-[11px] text-slate-light">
                  {new Date(r.createdAt).toLocaleDateString('en-GB')}
                </span>
              </div>
              {r.comment ? <p className="text-sm">{r.comment}</p> : null}
              {r.response ? (
                <p className="rounded-button bg-offwhite p-2 text-xs text-slate-dark dark:bg-slate-dark/40 dark:text-offwhite">
                  ↳ {r.response}
                </p>
              ) : null}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
