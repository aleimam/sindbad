'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Card } from '@sindbad/ui';
import { api } from '@/lib/api';
import { Markdown } from '@/components/markdown';

interface StaticPage {
  slug: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

export default function StaticPageView() {
  const { slug } = useParams<{ slug: string }>();
  const locale = useLocale();
  const [page, setPage] = useState<StaticPage | null | 'missing'>(null);

  useEffect(() => {
    api<StaticPage>(`/pages/${slug}`)
      .then(setPage)
      .catch(() => setPage('missing'));
  }, [slug]);

  if (page === null) return <p className="pt-10 text-center text-sm text-slate">…</p>;
  if (page === 'missing')
    return <p className="pt-10 text-center text-sm text-slate">404</p>;

  const isAr = locale === 'ar';
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">{isAr ? page.titleAr : page.titleEn}</h1>
      <Card className="p-5">
        <Markdown source={isAr ? page.bodyAr : page.bodyEn} dir={isAr ? 'rtl' : 'ltr'} />
      </Card>
    </div>
  );
}
