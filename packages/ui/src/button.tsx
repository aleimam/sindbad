import * as React from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: 'bg-royal text-white hover:bg-royal/90 border border-transparent',
  secondary:
    'bg-white dark:bg-navy text-royal border border-royal hover:bg-tint-blue dark:hover:bg-royal/10',
  ghost: 'bg-tint-blue dark:bg-royal/15 text-royal border border-transparent hover:bg-royal/15',
};

const sizes: Record<Size, string> = {
  md: 'px-4 py-2.5 text-sm',
  sm: 'px-3 py-2 text-xs',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-button font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
