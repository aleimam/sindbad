'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';

/** Simple GET hook: data / error / loading + refresh. */
export function useApiGet<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  const refresh = useCallback(() => {
    if (!path) return;
    setLoading(true);
    api<T>(path)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'error'))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, error, loading, refresh };
}

export interface Country {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
}

export interface Category {
  id: string;
  nameEn: string;
  nameAr: string;
  groupEn: string | null;
  groupAr: string | null;
}

export function useCountries() {
  return useApiGet<Country[]>('/catalog/countries');
}

export function useCategories() {
  return useApiGet<Category[]>('/catalog/categories');
}

export function localizedName(
  item: { nameEn: string; nameAr: string },
  locale: string,
): string {
  return locale === 'ar' ? item.nameAr : item.nameEn;
}
