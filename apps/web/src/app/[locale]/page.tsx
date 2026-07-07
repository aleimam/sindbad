import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Package, Plane, Search } from 'lucide-react';
import { Card } from '@sindbad/ui';
import { ApiStatus } from '@/components/api-status';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate">{t('home.greeting')}</p>
        <h1 className="font-display text-xl font-bold">{t('app.tagline')}</h1>
      </div>

      <div className="flex items-center gap-2 rounded-button border border-slate-border bg-white px-3.5 py-2.5 text-sm text-slate-light dark:border-slate-dark dark:bg-navy">
        <Search className="h-4 w-4" />
        {t('home.searchPlaceholder')}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-panel bg-tint-blue text-royal dark:bg-royal/15">
            <Plane className="h-5 w-5" />
          </div>
          <div className="text-sm font-semibold">{t('action.postTrip')}</div>
          <div className="text-xs text-slate">{t('action.postTripHint')}</div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-panel bg-status-completed-bg text-status-completed-fg">
            <Package className="h-5 w-5" />
          </div>
          <div className="text-sm font-semibold">{t('action.postShipment')}</div>
          <div className="text-xs text-slate">{t('action.postShipmentHint')}</div>
        </Card>
      </div>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">{t('home.matches')}</h2>
          <span className="text-xs font-semibold text-royal">{t('home.seeAll')}</span>
        </div>
        <Card className="p-5 text-center text-sm text-slate">{t('home.emptyMatches')}</Card>
      </section>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">{t('home.activeDeals')}</h2>
          <span className="text-xs font-semibold text-royal">{t('home.seeAll')}</span>
        </div>
        <Card className="p-5 text-center text-sm text-slate">{t('home.emptyDeals')}</Card>
      </section>

      <ApiStatus />
    </div>
  );
}
