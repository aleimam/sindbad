'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@sindbad/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { useMe } from '@/lib/use-me';

interface Complaint {
  id: string;
  targetType: 'REQUEST' | 'DEAL' | 'CHAT' | 'REVIEW';
  topic: string;
  details: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  decision: string | null;
  createdAt: string;
}

const statusColor: Record<Complaint['status'], string> = {
  NEW: 'bg-slate/10 text-slate',
  UNDER_REVIEW: 'bg-amber/10 text-amber',
  RESOLVED: 'bg-teal/10 text-teal',
  DISMISSED: 'bg-navy/5 text-navy dark:bg-white/10 dark:text-offwhite',
};

export default function SupportPage() {
  const t = useTranslations();
  const { me } = useMe();
  const [items, setItems] = useState<Complaint[] | null>(null);

  useEffect(() => {
    if (me) api<Complaint[]>('/complaints/mine').then(setItems).catch(() => setItems([]));
  }, [me]);

  if (me === undefined) return null;
  if (me === null)
    return (
      <div className="pt-10 text-center text-sm text-slate">
        {t('account.pleaseLogin')}{' '}
        <Link href="/login" className="text-royal underline">
          {t('auth.login')}
        </Link>
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">{t('support.myComplaints')}</h1>

      {items === null ? (
        <p className="text-sm text-slate">…</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate">{t('support.empty')}</Card>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <Card key={c.id} className="space-y-1.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{c.topic}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColor[c.status]}`}
                >
                  {t(`support.status.${c.status}`)}
                </span>
              </div>
              <p className="text-sm text-slate">{c.details}</p>
              <div className="text-[11px] text-slate-light">
                {t(`support.target.${c.targetType}`)} · {fmtDate(c.createdAt)}
              </div>
              {c.decision && (
                <p className="rounded-button bg-cloud px-3 py-2 text-xs text-navy dark:bg-white/5 dark:text-offwhite">
                  {c.decision}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
