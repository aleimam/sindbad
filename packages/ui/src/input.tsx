import * as React from 'react';
import { cn } from './cn';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-button border border-slate-border bg-white px-3.5 py-2.5 text-sm text-navy',
        'placeholder:text-slate-light focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/25',
        'dark:border-slate-dark dark:bg-navy dark:text-offwhite',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
