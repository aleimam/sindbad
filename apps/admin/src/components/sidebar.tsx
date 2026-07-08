'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Banknote,
  Gauge,
  LifeBuoy,
  Percent,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { cn } from '@sindbad/ui';

// The eight sidebar groups — docs/03-ux-information-architecture.md §2.
// Children light up as their modules are built.
const groups: Array<{
  label: string;
  Icon: typeof Gauge;
  href?: string;
  children?: Array<{ label: string; href: string }>;
}> = [
  { label: 'Dashboard', Icon: Gauge, href: '/' },
  {
    label: 'Users & KYC',
    Icon: Users,
    children: [{ label: 'Edit approvals', href: '/edit-approvals' }],
  },
  {
    label: 'Marketplace',
    Icon: Store,
    children: [
      { label: 'Trip approvals', href: '/trip-approvals' },
      { label: 'Cancellations', href: '/cancellations' },
    ],
  },
  { label: 'Finance', Icon: Banknote },
  { label: 'Support', Icon: LifeBuoy },
  { label: 'Pricing & Fees', Icon: Percent },
  { label: 'Catalogs & Settings', Icon: Settings },
  { label: 'Administration', Icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-e border-slate-border bg-navy text-offwhite md:flex">
      <div className="px-5 py-5">
        <div className="font-display text-lg font-bold tracking-tight">Sindbad</div>
        <div className="text-[11px] font-medium text-sky">Admin</div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {groups.map(({ label, Icon, href, children }) => (
          <div key={label}>
            {href ? (
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-button px-3 py-2.5 text-sm',
                  pathname === href
                    ? 'bg-royal font-semibold text-white'
                    : 'text-slate-light hover:bg-white/5 hover:text-offwhite',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ) : (
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-button px-3 py-2.5 text-sm',
                  children?.length ? 'text-offwhite/90' : 'text-slate-light/50',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </div>
            )}
            {children?.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={cn(
                  'ms-9 flex rounded-button px-3 py-2 text-xs',
                  pathname === c.href
                    ? 'bg-royal/80 font-semibold text-white'
                    : 'text-slate-light hover:bg-white/5 hover:text-offwhite',
                )}
              >
                {c.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 text-[10px] text-slate-light">v0.0.1 — Phase 2</div>
    </aside>
  );
}
