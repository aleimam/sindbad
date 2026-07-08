'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@sindbad/ui';
import { api, ApiError } from '@/lib/api';

type Step = 'password' | 'totp' | 'enroll';

interface LoginResponse {
  pending2fa: boolean;
  challengeToken?: string;
  mustEnroll2fa?: boolean;
}

interface SetupResponse {
  secret: string;
  otpauthUri: string;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<LoginResponse>('/admin/auth/login', {
        body: { identifier: identifier.trim(), password },
      });
      if (res.pending2fa && res.challengeToken) {
        setChallengeToken(res.challengeToken);
        setStep('totp');
      } else if (res.mustEnroll2fa) {
        const s = await api<SetupResponse>('/admin/auth/2fa/setup', { body: {} });
        setSetup(s);
        setStep('enroll');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/admin/auth/2fa/verify', { body: { challengeToken, code } });
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Wrong code');
      setBusy(false);
    }
  }

  async function submitEnroll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/admin/auth/2fa/enable', { body: { code } });
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Wrong code');
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy p-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-white">Sindbad</div>
          <div className="text-xs font-medium text-sky">Staff backend</div>
        </div>

        <Card className="p-6">
          {step === 'password' ? (
            <form onSubmit={submitPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate" htmlFor="id">
                  Email or phone
                </label>
                <Input
                  id="id"
                  dir="ltr"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate" htmlFor="pw">
                  Password
                </label>
                <Input
                  id="pw"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error ? <p className="text-xs text-error">{error}</p> : null}
              <Button type="submit" disabled={busy} className="w-full">
                Log in
              </Button>
            </form>
          ) : step === 'totp' ? (
            <form onSubmit={submitTotp} className="space-y-4">
              <p className="text-sm text-slate">Enter the 6-digit code from your authenticator.</p>
              <Input
                inputMode="numeric"
                dir="ltr"
                maxLength={6}
                className="text-center text-lg tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              {error ? <p className="text-xs text-error">{error}</p> : null}
              <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
                Verify
              </Button>
            </form>
          ) : (
            <form onSubmit={submitEnroll} className="space-y-4">
              <p className="text-sm font-semibold">Set up two-factor authentication</p>
              <p className="text-xs text-slate">
                Add this secret to Google Authenticator / Authy, then confirm with a code. 2FA
                becomes mandatory for your account.
              </p>
              <div className="rounded-button bg-offwhite p-3 text-center">
                <div className="break-all font-mono text-sm font-semibold">{setup?.secret}</div>
              </div>
              <Input
                inputMode="numeric"
                dir="ltr"
                maxLength={6}
                placeholder="First code"
                className="text-center text-lg tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              {error ? <p className="text-xs text-error">{error}</p> : null}
              <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
                Enable 2FA
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
