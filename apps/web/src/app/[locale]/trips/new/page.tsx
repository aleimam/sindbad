'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createTripSchema } from '@sindbad/shared';
import { Button, Card, Input } from '@sindbad/ui';
import { useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import { usdToCents } from '@/lib/format';
import { useCategories, useCountries } from '@/lib/use-api';
import { CountrySelect } from '@/components/country-select';
import { CategoryPicker } from '@/components/category-picker';
import { Field } from '@/components/field';

export default function NewTripPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data: countries } = useCountries();
  const { data: categories } = useCategories();

  const [form, setForm] = useState({
    originCountryId: '',
    destinationCountryId: '',
    receivingStart: '',
    receivingEnd: '',
    tripDate: '',
    deliveryDate: '',
    deliveryLocation: '',
    receivingAddress: '',
    travelerCount: '1',
    availableWeightKg: '',
    feeUsd: '',
    notes: '',
  });
  const [allowedCategoryIds, setAllowed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const candidate = {
      originCountryId: form.originCountryId,
      destinationCountryId: form.destinationCountryId,
      receivingStart: form.receivingStart || undefined,
      receivingEnd: form.receivingEnd,
      tripDate: form.tripDate,
      deliveryDate: form.deliveryDate,
      deliveryLocation: form.deliveryLocation,
      receivingAddress: form.receivingAddress,
      travelerCount: Number(form.travelerCount) || 1,
      availableWeightKg: Number(form.availableWeightKg),
      feeUsd: form.feeUsd ? usdToCents(form.feeUsd) : undefined,
      notes: form.notes || undefined,
      allowedCategoryIds,
      isCyclic: false,
    };
    const parsed = createTripSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('auth.genericError'));
      return;
    }

    setBusy(true);
    try {
      const mission = await api<{ id: string }>('/trips', { body: parsed.data });
      router.push(`/trips/${mission.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">{t('action.postTrip')}</h1>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('market.origin')}>
              <CountrySelect
                countries={countries}
                value={form.originCountryId}
                onChange={(id) => setForm((f) => ({ ...f, originCountryId: id }))}
                placeholder={t('market.selectCountry')}
              />
            </Field>
            <Field label={t('market.destination')}>
              <CountrySelect
                countries={countries}
                value={form.destinationCountryId}
                onChange={(id) => setForm((f) => ({ ...f, destinationCountryId: id }))}
                placeholder={t('market.selectCountry')}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('market.receivingStart')} hint={t('market.receivingStartHint')}>
              <Input type="date" value={form.receivingStart} onChange={set('receivingStart')} />
            </Field>
            <Field label={t('market.receivingEnd')}>
              <Input type="date" value={form.receivingEnd} onChange={set('receivingEnd')} required />
            </Field>
            <Field label={t('market.tripDate')} hint={t('market.tripDatePrivate')}>
              <Input type="date" value={form.tripDate} onChange={set('tripDate')} required />
            </Field>
            <Field label={t('market.deliveryDate')}>
              <Input type="date" value={form.deliveryDate} onChange={set('deliveryDate')} required />
            </Field>
          </div>

          <Field label={t('market.deliveryLocation')} hint={t('market.deliveryLocationHint')}>
            <Input value={form.deliveryLocation} onChange={set('deliveryLocation')} required />
          </Field>
          <Field label={t('market.receivingAddress')} hint={t('market.receivingAddressHint')}>
            <Input value={form.receivingAddress} onChange={set('receivingAddress')} required />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t('market.travelers')}>
              <Input
                type="number"
                min={1}
                value={form.travelerCount}
                onChange={set('travelerCount')}
              />
            </Field>
            <Field label={t('market.weightKg')}>
              <Input
                type="number"
                step="0.1"
                min={0}
                value={form.availableWeightKg}
                onChange={set('availableWeightKg')}
                required
              />
            </Field>
            <Field label={t('market.feeUsdLabel')}>
              <Input type="number" step="0.01" min={0} value={form.feeUsd} onChange={set('feeUsd')} />
            </Field>
          </div>

          <Field label={t('market.allowedCategories')}>
            <CategoryPicker
              categories={categories}
              selected={allowedCategoryIds}
              onToggle={(id) =>
                setAllowed((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
              }
            />
          </Field>

          <Field label={t('market.notes')}>
            <Input value={form.notes} onChange={set('notes')} />
          </Field>

          {error ? <p className="text-xs text-error">{error}</p> : null}
          <p className="text-[11px] text-slate-light">{t('market.tripApprovalNote')}</p>
          <Button type="submit" disabled={busy} className="w-full">
            {t('action.postTrip')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
