'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { WifiOff } from 'lucide-react';
import { useOnline } from '@/lib/use-online';
import { flushChatOutbox } from '@/lib/chat-outbox';

/** Registers the service worker and shows an offline banner. Renders once, app-wide. */
export function Pwa() {
  const t = useTranslations();
  const online = useOnline();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    // Register after load so it never competes with first paint.
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  // App-wide outbox flush: deliver messages queued in ANY chat thread when
  // connectivity returns (or on first load), even if that conversation isn't
  // open. Flushes are claim-based + serialized, so this can never double-send
  // alongside a conversation page's own flush.
  useEffect(() => {
    if (online) void flushChatOutbox();
  }, [online]);

  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-16 z-40 mx-auto w-fit max-w-[92%] rounded-pill bg-navy px-4 py-2 text-xs font-medium text-offwhite shadow-lg dark:bg-slate-dark"
    >
      <span className="flex items-center gap-2">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        {t('system.offline')}
      </span>
    </div>
  );
}
