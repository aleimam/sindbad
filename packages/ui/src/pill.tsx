import * as React from 'react';
import { cn } from './cn';
import type { DealStatus, CredibilityTier } from '@sindbad/shared';

export type StatusVariant = 'negotiating' | 'ongoing' | 'completed' | 'cancelled';

/** Collapse the full DealStatus enum into the four visual pill variants. */
export function dealStatusVariant(status: DealStatus): StatusVariant {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    case 'ONGOING':
    case 'ARRIVED_DESTINATION':
    case 'READY_FOR_PICKUP':
      return 'ongoing';
    default:
      return 'negotiating';
  }
}

const statusClasses: Record<StatusVariant, string> = {
  negotiating: 'bg-status-negotiating-bg text-status-negotiating-fg',
  ongoing: 'bg-status-ongoing-bg text-status-ongoing-fg',
  completed: 'bg-status-completed-bg text-status-completed-fg',
  cancelled: 'bg-status-cancelled-bg text-status-cancelled-fg',
};

export function StatusPill({
  variant,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant: StatusVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-semibold',
        statusClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

const tierClasses: Record<CredibilityTier, string> = {
  NEW: 'bg-tier-new-bg text-tier-new-fg',
  BRONZE: 'bg-tier-bronze-bg text-tier-bronze-fg',
  SILVER: 'bg-tier-silver-bg text-tier-silver-fg',
  GOLD: 'bg-tier-gold-bg text-tier-gold-fg',
  PLATINUM: 'bg-tier-platinum-bg text-tier-platinum-fg',
};

export function TierBadge({
  tier,
  score,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tier: CredibilityTier; score?: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-semibold',
        tierClasses[tier],
        className,
      )}
      {...props}
    >
      {props.children}
      {typeof score === 'number' ? <span>{score}</span> : null}
    </span>
  );
}
