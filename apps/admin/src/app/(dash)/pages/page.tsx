'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input } from '@sindbad/ui';
import { api } from '@/lib/api';

interface StaticPage {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  published: boolean;
  systemPage: boolean;
  updatedAt: string;
}

type Draft = Omit<StaticPage, 'id' | 'systemPage' | 'updatedAt'>;

const EMPTY: Draft = {
  slug: '',
  titleEn: '',
  titleAr: '',
  bodyEn: '',
  bodyAr: '',
  published: false,
};

export default function PagesCmsPage() {
  const [pages, setPages] = useState<StaticPage[] | null>(null);
  const [editing, setEditing] = useState<StaticPage | 'new' | null>(null);

  const load = useCallback(() => {
    api<StaticPage[]>('/admin/pages').then(setPages).catch(() => setPages([]));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Static pages</h1>
            <p className="text-sm text-slate">Bilingual content — publish to make it public.</p>
          </div>
          <Button size="sm" onClick={() => setEditing('new')}>
            New page
          </Button>
        </div>

        {pages === null ? (
          <Card className="p-8 text-center text-sm text-slate">Loading…</Card>
        ) : (
          <div className="space-y-2">
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setEditing(p)}
                className="flex w-full items-center justify-between rounded-card border border-slate-border bg-white px-4 py-3 text-start hover:border-royal"
              >
                <div>
                  <div className="text-sm font-semibold">{p.titleEn}</div>
                  <div className="text-[11px] text-slate-light" dir="ltr">
                    /{p.slug}
                  </div>
                </div>
                <span
                  className={
                    p.published
                      ? 'rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-teal'
                      : 'rounded-full bg-slate/10 px-2 py-0.5 text-[11px] font-semibold text-slate'
                  }
                >
                  {p.published ? 'published' : 'draft'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {editing ? (
          <PageEditor
            page={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        ) : (
          <Card className="p-10 text-center text-sm text-slate">
            Select a page to edit, or create a new one.
          </Card>
        )}
      </div>
    </div>
  );
}

function PageEditor({
  page,
  onClose,
  onSaved,
}: {
  page: StaticPage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(page ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNew = page === null;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        await api('/admin/pages', { body: draft });
      } else {
        const { slug: _slug, ...rest } = draft; // slug is immutable after creation
        await api(`/admin/pages/${page.id}`, { method: 'PUT', body: rest });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!page) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/pages/${page.id}`, { method: 'DELETE' });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{isNew ? 'New page' : draft.titleEn}</h2>
        <button onClick={onClose} className="text-sm text-slate hover:text-navy">
          Close
        </button>
      </div>

      <label className="block text-sm">
        Slug (URL) {!isNew && <span className="text-[11px] text-slate-light">— fixed</span>}
        <Input
          value={draft.slug}
          disabled={!isNew}
          placeholder="privacy"
          onChange={(e) => set('slug', e.target.value)}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          Title (EN)
          <Input value={draft.titleEn} onChange={(e) => set('titleEn', e.target.value)} />
        </label>
        <label className="block text-sm">
          Title (AR)
          <Input value={draft.titleAr} dir="rtl" onChange={(e) => set('titleAr', e.target.value)} />
        </label>
      </div>

      <label className="block text-sm">
        Body (EN) — Markdown
        <textarea
          value={draft.bodyEn}
          onChange={(e) => set('bodyEn', e.target.value)}
          rows={8}
          className="mt-1 w-full rounded-button border border-slate-border px-3 py-2 font-mono text-xs"
        />
      </label>
      <label className="block text-sm">
        Body (AR) — Markdown
        <textarea
          value={draft.bodyAr}
          dir="rtl"
          onChange={(e) => set('bodyAr', e.target.value)}
          rows={8}
          className="mt-1 w-full rounded-button border border-slate-border px-3 py-2 font-mono text-xs"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.published}
          onChange={(e) => set('published', e.target.checked)}
        />
        Published (visible to the public)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        {!isNew && !page.systemPage ? (
          <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
            Delete
          </Button>
        ) : (
          <span className="text-[11px] text-slate-light">
            {!isNew && page.systemPage ? 'Core page — cannot be deleted' : ''}
          </span>
        )}
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : isNew ? 'Create' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}
