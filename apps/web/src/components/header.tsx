'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import { Bell, MessageCircle, Moon, Sun } from 'lucide-react';
import { Avatar } from '@sindbad/ui';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useMe } from '@/lib/use-me';

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { me } = useMe();

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const displayName = me?.memberships[0]?.account.displayName ?? me?.email ?? me?.phone ?? '';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-border bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-dark dark:bg-navy/95">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="font-display text-lg font-bold tracking-tight text-navy dark:text-offwhite">
          {t('app.name')}
        </span>
      </Link>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Switch language"
          onClick={() => router.replace(pathname, { locale: otherLocale })}
          className="text-xs font-semibold text-royal"
        >
          {otherLocale === 'ar' ? 'العربية' : 'EN'}
        </button>

        <button
          type="button"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="text-slate-dark dark:text-offwhite"
        >
          <Sun className="hidden h-5 w-5 dark:block" />
          <Moon className="block h-5 w-5 dark:hidden" />
        </button>

        {me ? (
          <>
            <button
              type="button"
              aria-label="Notifications"
              className="relative text-slate-dark dark:text-offwhite"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Chat"
              className="relative text-slate-dark dark:text-offwhite"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            <Link href="/account" aria-label={t('account.title')}>
              <Avatar name={displayName || 'S U'} className="h-7 w-7" />
            </Link>
          </>
        ) : me === null ? (
          <Link
            href="/login"
            className="rounded-button bg-royal px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            {t('auth.login')}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
