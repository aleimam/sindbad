'use client';

import { useLocale } from 'next-intl';
import { localizedName, type Country } from '@/lib/use-api';

export function CountrySelect({
  id,
  countries,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  countries: Country[] | undefined;
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const locale = useLocale();
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-button border border-slate-border bg-white px-3.5 py-2.5 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/25 dark:border-slate-dark dark:bg-navy dark:text-offwhite"
    >
      <option value="">{placeholder}</option>
      {(countries ?? []).map((c) => (
        <option key={c.id} value={c.id}>
          {localizedName(c, locale)}
        </option>
      ))}
    </select>
  );
}
