'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function ApiStatus() {
  const t = useTranslations('system');
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/health`)
      .then((r) => !cancelled && setOnline(r.ok))
      .catch(() => !cancelled && setOnline(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (online === null) return null;

  return (
    <p className="text-center text-[11px] text-slate-light">
      {t('apiStatus')}:{' '}
      <span className={online ? 'text-teal' : 'text-error'}>
        {online ? t('online') : t('offline')}
      </span>
    </p>
  );
}
