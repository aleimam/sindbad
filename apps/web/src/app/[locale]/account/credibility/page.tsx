'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';
import { Card, TierBadge } from '@sindbad/ui';
import { useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';

interface Breakdown {
  credibilityScore: number;
  credibilityTier: 'NEW' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  byKind: Record<string, number>;
  events: Array<{
    id: string;
    kind: string;
    points: number;
    note: string | null;
    createdAt: string;
  }>;
}

export default function CredibilityPage() {
  const t = useTranslations();
  const { me } = useMe();
  const { data } = useApiGet<Breakdown>(me ? '/credibility' : null);

  if (me === null)
    return (
      <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>
    );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">{t('cred.title')}</h1>

      <Card className="flex flex-col items-center gap-2 p-6 text-center">
        <ShieldCheck className="h-8 w-8 text-royal" />
        <div className="font-display text-4xl font-bold">{data?.credibilityScore ?? '—'}</div>
        {data ? <TierBadge tier={data.credibilityTier}>{t(`cred.tier.${data.credibilityTier}`)} ·</TierBadge> : null}
        <p className="text-xs text-slate">{t('cred.hint')}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(data?.byKind ?? {}).map(([kind, points]) => (
          <Card key={kind} className="p-3.5">
            <div className="text-[11px] text-slate">{t(`cred.kind.${kind}`)}</div>
            <div className="text-lg font-bold">
              {points >= 0 ? '+' : ''}
              {points}
            </div>
          </Card>
        ))}
      </div>

      {data?.events.length ? (
        <Card className="divide-y divide-slate-border overflow-hidden dark:divide-slate-dark">
          {data.events.slice(0, 20).map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
              <span>{t(`cred.kind.${e.kind}`)}</span>
              <span className={e.points >= 0 ? 'font-semibold text-teal' : 'font-semibold text-error'}>
                {e.points >= 0 ? '+' : ''}
                {e.points}
              </span>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
