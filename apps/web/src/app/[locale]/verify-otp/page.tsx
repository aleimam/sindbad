'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { verifyOtpSchema } from '@sindbad/shared';
import { Button, Card, Input } from '@sindbad/ui';
import { useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import { notifyAuthChanged } from '@/lib/use-me';

function VerifyOtpForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useSearchParams();
  const challengeId = params.get('challenge') ?? '';
  const devCode = params.get('dev');

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = verifyOtpSchema.safeParse({ challengeId, code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('genericError'));
      return;
    }

    setBusy(true);
    try {
      await api('/auth/verify-otp', { body: parsed.data });
      notifyAuthChanged();
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-5 pt-6">
      <div>
        <h1 className="font-display text-xl font-bold">{t('otpTitle')}</h1>
        <p className="text-sm text-slate">{t('otpHint')}</p>
      </div>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate" htmlFor="code">
              {t('code')}
            </label>
            <Input
              id="code"
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              autoComplete="one-time-code"
              className="text-center text-lg tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          {devCode ? (
            <p className="rounded-button bg-tint-blue px-3 py-2 text-center text-xs text-royal">
              {t('devCodeHint')}: <span className="font-mono font-semibold">{devCode}</span>
            </p>
          ) : null}
          {error ? <p className="text-xs text-error">{error}</p> : null}
          <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
            {t('verify')}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
