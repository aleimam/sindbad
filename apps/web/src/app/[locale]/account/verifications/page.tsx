'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BadgeCheck } from 'lucide-react';
import { Button, Card, Input, StatusPill } from '@sindbad/ui';
import { api, ApiError } from '@/lib/api';
import { fmtAmount } from '@/lib/format';
import { useApiGet } from '@/lib/use-api';
import { useMe } from '@/lib/use-me';
import { PhotoUploader } from '@/components/photo-uploader';

interface VerificationType {
  id: string;
  key: string;
  nameEn: string;
  nameAr: string;
  priceUsd: number;
  credibilityPoints: number;
  durationDays: number;
  latest: {
    id: string;
    status: 'NEW' | 'STUDYING' | 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
    socialCode: string | null;
  } | null;
}

const STATUS_VARIANT = {
  NEW: 'negotiating',
  STUDYING: 'ongoing',
  VERIFIED: 'completed',
  NEEDS_REVIEW: 'negotiating',
  REJECTED: 'cancelled',
} as const;

export default function VerificationsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { me } = useMe();
  const types = useApiGet<VerificationType[]>(me ? '/verifications/types' : null);

  const [requesting, setRequesting] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(typeKey: string) {
    setBusy(true);
    setError(null);
    try {
      await api('/verifications', { body: { typeKey, details: details || undefined } });
      setRequesting(null);
      setDetails('');
      types.refresh();
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
        <h1 className="font-display text-xl font-bold">{t('verif.title')}</h1>
        <p className="text-sm text-slate">{t('verif.hint')}</p>
      </div>

      <div className="space-y-2.5">
        {(types.data ?? []).map((vt) => {
          const name = locale === 'ar' ? vt.nameAr : vt.nameEn;
          const open =
            vt.latest && ['NEW', 'STUDYING', 'NEEDS_REVIEW'].includes(vt.latest.status);
          return (
            <Card key={vt.id} className="space-y-2.5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <BadgeCheck
                    className={
                      vt.latest?.status === 'VERIFIED' ? 'h-4 w-4 text-teal' : 'h-4 w-4 text-slate-light'
                    }
                  />
                  {name}
                </div>
                {vt.latest ? (
                  <StatusPill variant={STATUS_VARIANT[vt.latest.status]}>
                    {t(`verif.status.${vt.latest.status}`)}
                  </StatusPill>
                ) : null}
              </div>
              <div className="text-[11px] text-slate">
                {vt.priceUsd > 0 ? fmtAmount(vt.priceUsd, 'USD') : t('verif.free')} · +
                {vt.credibilityPoints} {t('verif.points')} · ~{vt.durationDays} {t('verif.days')}
              </div>

              {vt.latest?.socialCode && open ? (
                <div className="rounded-button bg-tint-blue p-3 text-xs dark:bg-royal/15">
                  {t('verif.socialCodeHint')}:{' '}
                  <span className="font-mono font-bold">{vt.latest.socialCode}</span>
                </div>
              ) : null}

              {open && vt.latest ? (
                <div className="flex items-center gap-2">
                  <PhotoUploader context="KYC" subjectId={vt.latest.id} onDone={types.refresh} />
                  <span className="text-[11px] text-slate-light">{t('verif.uploadHint')}</span>
                </div>
              ) : null}

              {!vt.latest || vt.latest.status === 'REJECTED' ? (
                requesting === vt.key ? (
                  <div className="space-y-2">
                    <Input
                      placeholder={t('verif.detailsPlaceholder')}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                    {error ? <p className="text-xs text-error">{error}</p> : null}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy} onClick={() => request(vt.key)}>
                        {t('verif.confirmRequest')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRequesting(null)}>
                        {t('verif.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setRequesting(vt.key)}>
                    {t('verif.request')}
                  </Button>
                )
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
