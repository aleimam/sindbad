'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card } from '@sindbad/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

interface PageLink {
  slug: string;
  titleEn: string;
  titleAr: string;
}

export default function LegalIndexPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [pages, setPages] = useState<PageLink[] | null>(null);

  useEffect(() => {
    api<PageLink[]>('/pages').then(setPages).catch(() => setPages([]));
  }, []);

  const isAr = locale === 'ar';
  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">{t('legal.title')}</h1>
      {pages === null ? (
        <p className="text-sm text-slate">…</p>
      ) : pages.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate">{t('legal.empty')}</Card>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <Link key={p.slug} href={`/pages/${p.slug}`} className="block">
              <Card className="p-4 text-sm font-semibold hover:border-royal">
                {isAr ? p.titleAr : p.titleEn}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
