import * as React from 'react';
import { cn } from './cn';

export function MetricCard({
  label,
  value,
  hint,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label: string; value: string; hint?: string }) {
  return (
    <div
      className={cn(
        'rounded-panel border border-slate-border bg-white p-4 dark:border-slate-dark dark:bg-slate-dark/40',
        className,
      )}
      {...props}
    >
      <div className="text-xs font-medium text-slate">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-navy dark:text-offwhite">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-light">{hint}</div> : null}
    </div>
  );
}
