'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { registerSchema } from '@sindbad/shared';
import { Button, Card, Input } from '@sindbad/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';

interface RegisterResponse {
  userId: string;
  challengeId: string;
  devCode?: string;
}

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      password,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('genericError'));
      return;
    }

    setBusy(true);
    try {
      const res = await api<RegisterResponse>('/auth/register', { body: parsed.data });
      const dev = res.devCode ? `&dev=${res.devCode}` : '';
      router.push(`/verify-otp?challenge=${res.challengeId}${dev}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-5 pt-6">
      <h1 className="font-display text-xl font-bold">{t('register')}</h1>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate" htmlFor="email">
              {t('email')}
            </label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate" htmlFor="phone">
              {t('phone')}
            </label>
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              placeholder="+20 …"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-[11px] text-slate-light">{t('contactHint')}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate" htmlFor="password">
              {t('password')}
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-xs text-error">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {t('register')}
          </Button>
        </form>
      </Card>
      <p className="text-center text-xs text-slate">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-semibold text-royal">
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
