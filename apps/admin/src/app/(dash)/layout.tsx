'use client';

import { Sidebar } from '@/components/sidebar';
import { useStaff } from '@/lib/use-staff';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { staff } = useStaff();

  if (!staff) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate">Loading…</div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-border bg-white px-6 py-3.5">
          <div className="text-sm font-semibold text-slate-dark">
            {staff.isSuperAdmin ? 'Super admin' : 'Staff'}
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-royal text-xs font-semibold text-white">
            SA
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
