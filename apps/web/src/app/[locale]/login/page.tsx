'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { loginSchema } from '@sindbad/shared';
import { Button, Card, Input } from '@sindbad/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import { notifyAuthChanged } from '@/lib/use-me';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ identifier: identifier.trim(), password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('genericError'));
      return;
    }

    setBusy(true);
    try {
      await api('/auth/login', { body: parsed.data });
      notifyAuthChanged();
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-5 pt-6">
      <h1 className="font-display text-xl font-bold">{t('login')}</h1>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate" htmlFor="identifier">
              {t('identifier')}
            </label>
            <Input
              id="identifier"
              dir="ltr"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate" htmlFor="password">
              {t('password')}
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-xs text-error">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {t('login')}
          </Button>
        </form>
      </Card>
      <p className="text-center text-xs text-slate">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-semibold text-royal">
          {t('register')}
        </Link>
      </p>
    </div>
  );
}
