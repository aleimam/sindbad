'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, Card } from '@sindbad/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useMe } from '@/lib/use-me';
import { useChatSocket } from '@/lib/use-chat-socket';
import type { ChatThreadSummary } from '@/lib/chat-types';

export default function ChatListPage() {
  const t = useTranslations();
  const { me } = useMe();
  const [threads, setThreads] = useState<ChatThreadSummary[] | null>(null);

  const load = useCallback(() => {
    api<ChatThreadSummary[]>('/chat/threads').then(setThreads).catch(() => setThreads([]));
  }, []);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  useChatSocket({ 'message.new': load, 'thread.read': load });

  if (me === null)
    return (
      <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>
    );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">{t('chat.title')}</h1>

      {threads === null ? (
        <Card className="p-6 text-center text-sm text-slate">{t('market.loading')}</Card>
      ) : threads.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate">{t('chat.empty')}</Card>
      ) : (
        <div className="space-y-2">
          {threads.map((th) => (
            <Link key={th.id} href={`/chat/${th.id}`} className="block">
              <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-royal">
                <Avatar name={th.other.displayName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{th.other.displayName}</span>
                    <span className="text-[11px] text-slate-light">
                      {new Date(th.lastMessageAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-slate">
                      {th.lastMessage?.unsent
                        ? t('chat.unsent')
                        : (th.lastMessage?.body ?? t('chat.photo'))}
                    </span>
                    {th.unread > 0 ? (
                      <span className="rounded-pill bg-royal px-1.5 text-[10px] font-semibold text-white">
                        {th.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
