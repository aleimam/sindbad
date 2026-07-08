'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, Loader2 } from 'lucide-react';
import { apiUpload } from '@/lib/api';

/** Small upload button: picks image(s), posts multipart, calls onDone per success. */
export function PhotoUploader({
  context,
  subjectId,
  onDone,
}: {
  context: 'ITEM_PHOTO' | 'TRIP_VERIFICATION' | 'KYC';
  subjectId: string;
  onDone: () => void;
}) {
  const t = useTranslations('media');
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set('file', file);
        form.set('context', context);
        form.set('subjectId', subjectId);
        await apiUpload('/media/upload', form);
      }
      onDone();
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-pill bg-tint-blue px-3 py-1.5 text-xs font-semibold text-royal disabled:opacity-50 dark:bg-royal/15"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
        {busy ? t('uploading') : t('addPhoto')}
      </button>
      {error ? <span className="text-[11px] text-error">{error}</span> : null}
    </span>
  );
}
