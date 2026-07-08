'use client';

import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@sindbad/ui';
import { localizedName, type Category } from '@/lib/use-api';

export type Stance = 'ACCEPT' | 'ASK' | 'REJECT';

const STYLE: Record<Stance, string> = {
  ACCEPT: 'border-royal bg-royal text-white',
  ASK: 'border-amber bg-status-negotiating-bg text-status-negotiating-fg',
  REJECT: 'border-error bg-status-cancelled-bg text-status-cancelled-fg',
};

/** Chips cycling through stances (click to advance). `cycle` defines the order after unset. */
export function TriCategoryPicker({
  categories,
  value,
  onChange,
  cycle,
}: {
  categories: Category[] | undefined;
  value: Record<string, Stance | undefined>;
  onChange: (id: string, next: Stance | undefined) => void;
  cycle: Stance[];
}) {
  const locale = useLocale();
  const t = useTranslations('market.stance');

  function next(current: Stance | undefined): Stance | undefined {
    if (current === undefined) return cycle[0];
    const idx = cycle.indexOf(current);
    return idx === cycle.length - 1 ? undefined : cycle[idx + 1];
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(categories ?? []).map((c) => {
        const stance = value[c.id];
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id, next(stance))}
            className={cn(
              'rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors',
              stance
                ? STYLE[stance]
                : 'border-slate-border bg-white text-slate-dark hover:border-royal dark:border-slate-dark dark:bg-navy dark:text-offwhite',
            )}
          >
            {localizedName(c, locale)}
            {stance ? ` · ${t(stance)}` : ''}
          </button>
        );
      })}
    </div>
  );
}
