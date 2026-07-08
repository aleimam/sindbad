'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, Handshake, Megaphone } from 'lucide-react';
import { Button, Card, cn } from '@sindbad/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useMe } from '@/lib/use-me';

interface Notification {
  id: string;
  type: 'MATCH' | 'DEAL' | 'ADMIN';
  title: string | null;
  body: string;
  data: { dealId?: string; tripMissionId?: string; shipmentMissionId?: string } | null;
  readAt: string | null;
  createdAt: string;
}

const ICON = { MATCH: Handshake, DEAL: Bell, ADMIN: Megaphone } as const;

export default function NotificationsPage() {
  const t = useTranslations();
  const { me } = useMe();
  const [items, setItems] = useState<Notification[] | null>(null);

  const load = useCallback(() => {
    api<Notification[]>('/notifications').then(setItems).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  async function markAll() {
    await api('/notifications/read-all', { body: {} }).catch(() => undefined);
    load();
  }

  async function open(n: Notification) {
    if (!n.readAt) await api(`/notifications/${n.id}/read`, { body: {} }).catch(() => undefined);
    load();
  }

  if (me === null)
    return (
      <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{t('notif.title')}</h1>
        {items?.some((n) => !n.readAt) ? (
          <Button size="sm" variant="ghost" onClick={markAll}>
            {t('notif.markAll')}
          </Button>
        ) : null}
      </div>

      {items === null ? (
        <Card className="p-6 text-center text-sm text-slate">{t('market.loading')}</Card>
      ) : items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate">{t('notif.empty')}</Card>
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            const href = n.data?.dealId
              ? `/deals/${n.data.dealId}`
              : n.data?.tripMissionId
                ? `/trips/${n.data.tripMissionId}`
                : null;
            const inner = (
              <Card
                className={cn(
                  'flex items-start gap-3 p-4',
                  !n.readAt && 'border-royal/40 bg-tint-blue/40 dark:bg-royal/10',
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-panel',
                    n.type === 'MATCH'
                      ? 'bg-status-completed-bg text-status-completed-fg'
                      : 'bg-tint-blue text-royal dark:bg-royal/15',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{n.body}</div>
                  <div className="mt-0.5 text-[11px] text-slate-light">
                    {new Date(n.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                {!n.readAt ? <span className="mt-1.5 h-2 w-2 rounded-full bg-royal" /> : null}
              </Card>
            );
            return href ? (
              <Link key={n.id} href={href} className="block" onClick={() => open(n)}>
                {inner}
              </Link>
            ) : (
              <button key={n.id} type="button" className="block w-full text-start" onClick={() => open(n)}>
                {inner}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
