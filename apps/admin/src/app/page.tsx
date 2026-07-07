import { MetricCard } from '@sindbad/ui';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-slate">
          Placeholder KPIs — wired to real data from Phase 2 onward.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Users" value="—" hint="total registered" />
        <MetricCard label="Active missions" value="—" hint="trips + shipments" />
        <MetricCard label="Ongoing deals" value="—" hint="accepted, not completed" />
        <MetricCard label="Escrow held" value="—" hint="USD, all deals" />
      </div>

      <div className="rounded-card border border-dashed border-slate-border bg-white p-10 text-center text-sm text-slate">
        Charts & queues (trip approvals, verifications, deposits, complaints) land here as their
        modules are built.
      </div>
    </div>
  );
}
