import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card } from '@sindbad/ui';

export default async function ShipmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">{t('nav.shipments')}</h1>
      <Card className="p-6 text-center text-sm text-slate">{t('pages.comingSoon')}</Card>
    </div>
  );
}
