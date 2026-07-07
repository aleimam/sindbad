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

// The eight sidebar groups — docs/03-ux-information-architecture.md §2
const groups = [
  { label: 'Dashboard', Icon: Gauge, active: true },
  { label: 'Users & KYC', Icon: Users },
  { label: 'Marketplace', Icon: Store },
  { label: 'Finance', Icon: Banknote },
  { label: 'Support', Icon: LifeBuoy },
  { label: 'Pricing & Fees', Icon: Percent },
  { label: 'Catalogs & Settings', Icon: Settings },
  { label: 'Administration', Icon: ShieldCheck },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-e border-slate-border bg-navy text-offwhite md:flex">
      <div className="px-5 py-5">
        <div className="font-display text-lg font-bold tracking-tight">Sindbad</div>
        <div className="text-[11px] font-medium text-sky">Admin</div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {groups.map(({ label, Icon, active }) => (
          <a
            key={label}
            href="#"
            className={
              active
                ? 'flex items-center gap-2.5 rounded-button bg-royal px-3 py-2.5 text-sm font-semibold text-white'
                : 'flex items-center gap-2.5 rounded-button px-3 py-2.5 text-sm text-slate-light hover:bg-white/5 hover:text-offwhite'
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        ))}
      </nav>
      <div className="px-5 py-4 text-[10px] text-slate-light">v0.0.1 — Phase 0 shell</div>
    </aside>
  );
}
