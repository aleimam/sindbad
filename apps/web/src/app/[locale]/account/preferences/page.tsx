'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@sindbad/ui';
import { api, ApiError } from '@/lib/api';
import { useCategories } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';
import { TriCategoryPicker, type Stance } from '@/components/tri-category-picker';

export default function PreferencesPage() {
  const t = useTranslations();
  const { me } = useMe();
  const { data: categories } = useCategories();
  const [stances, setStances] = useState<Record<string, Stance | undefined>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    api<Array<{ categoryId: string; stance: Stance }>>('/preferences/categories')
      .then((prefs) => {
        const map: Record<string, Stance | undefined> = {};
        for (const p of prefs) map[p.categoryId] = p.stance;
        setStances(map);
      })
      .catch(() => undefined);
  }, [me]);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const items = Object.entries(stances)
        .filter(([, stance]) => stance !== undefined)
        .map(([categoryId, stance]) => ({ categoryId, stance: stance! }));
      await api('/preferences/categories', { method: 'PUT', body: { items } });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  if (me === null)
    return (
      <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">{t('prefs.title')}</h1>
        <p className="text-sm text-slate">{t('prefs.hint')}</p>
      </div>

      <Card className="p-5">
        <TriCategoryPicker
          categories={categories}
          value={stances}
          cycle={['ACCEPT', 'ASK', 'REJECT']}
          onChange={(id, next) => {
            setSaved(false);
            setStances((s) => ({ ...s, [id]: next }));
          }}
        />
      </Card>

      {error ? <p className="text-xs text-error">{error}</p> : null}
      {saved ? <p className="text-xs font-medium text-teal">{t('prefs.saved')}</p> : null}
      <Button className="w-full" disabled={busy} onClick={save}>
        {t('prefs.save')}
      </Button>
    </div>
  );
}
