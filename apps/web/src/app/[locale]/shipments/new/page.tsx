'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { createShipmentSchema } from '@sindbad/shared';
import { Button, Card, Input, cn } from '@sindbad/ui';
import { useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import { usdToCents } from '@/lib/format';
import { localizedName, useCategories, useCountries } from '@/lib/use-api';
import { CountrySelect } from '@/components/country-select';
import { Field } from '@/components/field';

interface ItemDraft {
  details: string;
  url: string;
  volumetricWeightKg: string;
  count: string;
  categoryId: string;
  declaredValueUsd: string;
}

const emptyItem = (): ItemDraft => ({
  details: '',
  url: '',
  volumetricWeightKg: '',
  count: '1',
  categoryId: '',
  declaredValueUsd: '',
});

export default function NewShipmentPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { data: countries } = useCountries();
  const { data: categories } = useCategories();

  const [originCountryId, setOrigin] = useState('');
  const [destinationCountryId, setDestination] = useState('');
  const [type, setType] = useState<'BOX' | 'BASKET'>('BOX');
  const [feeUsd, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setItem = (i: number, patch: Partial<ItemDraft>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const candidate = {
      originCountryId,
      destinationCountryId,
      type,
      feeUsd: feeUsd ? usdToCents(feeUsd) : undefined,
      notes: notes || undefined,
      isCyclic: false,
      items: items.map((it) => ({
        details: it.details,
        url: it.url || undefined,
        volumetricWeightKg: Number(it.volumetricWeightKg),
        count: Number(it.count) || 1,
        categoryId: it.categoryId,
        declaredValueUsd: it.declaredValueUsd ? usdToCents(it.declaredValueUsd) : undefined,
      })),
    };
    const parsed = createShipmentSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('auth.genericError'));
      return;
    }

    setBusy(true);
    try {
      const mission = await api<{ id: string }>('/shipments', { body: parsed.data });
      router.push(`/shipments/${mission.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">{t('action.postShipment')}</h1>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('market.origin')}>
              <CountrySelect
                countries={countries}
                value={originCountryId}
                onChange={setOrigin}
                placeholder={t('market.selectCountry')}
              />
            </Field>
            <Field label={t('market.destination')}>
              <CountrySelect
                countries={countries}
                value={destinationCountryId}
                onChange={setDestination}
                placeholder={t('market.selectCountry')}
              />
            </Field>
          </div>

          <Field label={t('market.shipmentType')} hint={t(`market.typeHint.${type}`)}>
            <div className="flex gap-2">
              {(['BOX', 'BASKET'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setType(k)}
                  className={cn(
                    'flex-1 rounded-button border px-3 py-2.5 text-sm font-semibold',
                    type === k
                      ? 'border-royal bg-royal text-white'
                      : 'border-slate-border bg-white text-slate-dark dark:border-slate-dark dark:bg-navy dark:text-offwhite',
                  )}
                >
                  {t(`market.type.${k}`)}
                </button>
              ))}
            </div>
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate">{t('market.itemsTitle')}</span>
              <Button size="sm" variant="ghost" type="button" onClick={() => setItems((a) => [...a, emptyItem()])}>
                <Plus className="h-3.5 w-3.5" /> {t('market.addItem')}
              </Button>
            </div>
            {items.map((it, i) => (
              <Card key={i} className="space-y-2.5 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate">
                    {t('market.item')} {i + 1}
                  </span>
                  {items.length > 1 ? (
                    <button
                      type="button"
                      aria-label="remove item"
                      onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}
                      className="text-slate-light hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <Input
                  placeholder={t('market.itemDetails')}
                  value={it.details}
                  onChange={(e) => setItem(i, { details: e.target.value })}
                  required
                />
                <Input
                  placeholder={t('market.itemUrl')}
                  dir="ltr"
                  value={it.url}
                  onChange={(e) => setItem(i, { url: e.target.value })}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    placeholder={t('market.kg')}
                    value={it.volumetricWeightKg}
                    onChange={(e) => setItem(i, { volumetricWeightKg: e.target.value })}
                    required
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder={t('market.count')}
                    value={it.count}
                    onChange={(e) => setItem(i, { count: e.target.value })}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder={t('market.valueUsd')}
                    value={it.declaredValueUsd}
                    onChange={(e) => setItem(i, { declaredValueUsd: e.target.value })}
                  />
                </div>
                <select
                  value={it.categoryId}
                  onChange={(e) => setItem(i, { categoryId: e.target.value })}
                  className="w-full rounded-button border border-slate-border bg-white px-3.5 py-2.5 text-sm dark:border-slate-dark dark:bg-navy"
                  required
                >
                  <option value="">{t('market.selectCategory')}</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {localizedName(c, locale)}
                    </option>
                  ))}
                </select>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('market.feeUsdLabel')}>
              <Input type="number" step="0.01" min={0} value={feeUsd} onChange={(e) => setFee(e.target.value)} />
            </Field>
            <Field label={t('market.notes')}>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>

          {error ? <p className="text-xs text-error">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {t('action.postShipment')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
