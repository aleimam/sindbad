'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Input } from '@sindbad/ui';
import { api } from '@/lib/api';

type TargetType = 'REQUEST' | 'DEAL' | 'CHAT' | 'REVIEW';

/** Reusable "Report a problem" trigger + modal. Drop it into deal / review / chat surfaces. */
export function ReportButton({
  targetType,
  targetId,
  className,
}: {
  targetType: TargetType;
  targetId: string;
  className?: string;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" className={className} onClick={() => setOpen(true)}>
        {t('support.report')}
      </Button>
      {open && <ReportDialog targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: TargetType;
  targetId: string;
  onClose: () => void;
}) {
  const t = useTranslations();
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api('/complaints', { body: { targetType, targetId, topic, details } });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 sm:items-center sm:p-4">
      <Card className="w-full max-w-md space-y-4 rounded-b-none p-6 sm:rounded-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{t('support.reportTitle')}</h2>
          <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-semibold text-navy dark:bg-white/10 dark:text-offwhite">
            {t(`support.target.${targetType}`)}
          </span>
        </div>

        {done ? (
          <>
            <p className="text-sm text-teal">{t('support.submitted')}</p>
            <div className="flex justify-end">
              <Button size="sm" onClick={onClose}>
                OK
              </Button>
            </div>
          </>
        ) : (
          <>
            <label className="block text-sm">
              {t('support.topic')}
              <Input
                value={topic}
                placeholder={t('support.topicPlaceholder')}
                onChange={(e) => setTopic(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              {t('support.details')}
              <textarea
                value={details}
                placeholder={t('support.detailsPlaceholder')}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-button border border-slate-border bg-offwhite px-3 py-2 text-sm dark:border-slate-dark dark:bg-slate-dark/40"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                {t('action.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={busy || topic.trim().length < 3 || details.trim().length < 1}
              >
                {busy ? t('support.submitting') : t('support.submit')}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
