import * as React from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-slate-border bg-white dark:border-slate-dark dark:bg-slate-dark/40',
        className,
      )}
      {...props}
    />
  );
}
