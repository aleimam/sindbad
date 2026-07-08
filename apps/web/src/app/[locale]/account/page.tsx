'use client';

import { useTranslations } from 'next-intl';
import { Button, Card, TierBadge } from '@sindbad/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { notifyAuthChanged, useMe } from '@/lib/use-me';

export default function AccountPage() {
  const t = useTranslations();
  const router = useRouter();
  const { me } = useMe();

  async function logout() {
    await api('/auth/logout', { body: {} }).catch(() => undefined);
    notifyAuthChanged();
    router.push('/');
  }

  if (me === undefined) return null;

  if (me === null) {
    return (
      <div className="mx-auto max-w-sm space-y-4 pt-10 text-center">
        <p className="text-sm text-slate">{t('account.pleaseLogin')}</p>
        <Link href="/login">
          <Button>{t('auth.login')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-bold">{t('account.title')}</h1>

      <Card className="space-y-3 p-5">
        <div className="text-xs font-medium text-slate">{t('account.contact')}</div>
        {me.email ? (
          <div className="flex items-center justify-between text-sm" dir="ltr">
            <span>{me.email}</span>
            <span className={me.emailVerifiedAt ? 'text-xs text-teal' : 'text-xs text-slate-light'}>
              {me.emailVerifiedAt ? t('account.verified') : t('account.notVerified')}
            </span>
          </div>
        ) : null}
        {me.phone ? (
          <div className="flex items-center justify-between text-sm" dir="ltr">
            <span>{me.phone}</span>
            <span className={me.phoneVerifiedAt ? 'text-xs text-teal' : 'text-xs text-slate-light'}>
              {me.phoneVerifiedAt ? t('account.verified') : t('account.notVerified')}
            </span>
          </div>
        ) : null}
      </Card>

      <div className="space-y-2.5">
        <h2 className="font-display text-base font-semibold">{t('account.yourAccounts')}</h2>
        {me.memberships.map((m) => (
          <Card key={m.account.id} className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm font-semibold">{m.account.displayName}</div>
              <div className="text-xs text-slate">
                {m.account.type} · {m.role}
              </div>
            </div>
            <TierBadge tier="NEW" score={0}>
              New ·
            </TierBadge>
          </Card>
        ))}
      </div>

      <Link href="/account/preferences" className="block">
        <Button variant="ghost" className="w-full">
          {t('prefs.title')}
        </Button>
      </Link>

      <Button variant="secondary" onClick={logout} className="w-full">
        {t('auth.logout')}
      </Button>
    </div>
  );
}
