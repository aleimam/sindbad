import * as React from 'react';
import { cn } from './cn';

export function CategoryChip({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border border-slate-border bg-white px-3 py-1.5',
        'text-xs font-medium text-slate-dark dark:border-slate-dark dark:bg-navy dark:text-offwhite',
        className,
      )}
      {...props}
    />
  );
}
