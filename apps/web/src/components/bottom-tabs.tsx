'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeftRight, Home, Package, Plane, User } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@sindbad/ui';

const tabs = [
  { href: '/', key: 'home', Icon: Home },
  { href: '/trips', key: 'trips', Icon: Plane },
  { href: '/shipments', key: 'shipments', Icon: Package },
  { href: '/deals', key: 'deals', Icon: ArrowLeftRight },
  { href: '/account', key: 'account', Icon: User },
] as const;

export function BottomTabs() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-slate-border bg-white/95 backdrop-blur dark:border-slate-dark dark:bg-navy/95"
    >
      <div className="flex items-stretch justify-around py-2">
        {tabs.map(({ href, key, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-14 flex-col items-center gap-0.5 rounded-button py-1 text-[10px] font-medium',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal',
                active ? 'text-royal' : 'text-slate-light hover:text-slate',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
