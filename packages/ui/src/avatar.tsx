import * as React from 'react';
import { cn } from './cn';

export function Avatar({
  name,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full bg-royal text-xs font-semibold text-white',
        className,
      )}
      {...props}
    >
      {initials}
    </div>
  );
}
