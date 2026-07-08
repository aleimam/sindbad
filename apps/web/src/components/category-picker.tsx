'use client';

import { useLocale } from 'next-intl';
import { cn } from '@sindbad/ui';
import { localizedName, type Category } from '@/lib/use-api';

/** Multi-select category chips (the trip's allowed set / item category). */
export function CategoryPicker({
  categories,
  selected,
  onToggle,
}: {
  categories: Category[] | undefined;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const locale = useLocale();
  return (
    <div className="flex flex-wrap gap-2">
      {(categories ?? []).map((c) => {
        const active = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            aria-pressed={active}
            className={cn(
              'rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-royal bg-royal text-white'
                : 'border-slate-border bg-white text-slate-dark hover:border-royal dark:border-slate-dark dark:bg-navy dark:text-offwhite',
            )}
          >
            {localizedName(c, locale)}
          </button>
        );
      })}
    </div>
  );
}
