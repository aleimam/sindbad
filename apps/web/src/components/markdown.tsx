/**
 * Minimal, safe Markdown renderer for admin-authored static pages.
 * Supports #/##/### headings, **bold**, and paragraphs/line breaks only —
 * everything else is rendered as escaped text (React escapes by default),
 * so there is no raw-HTML injection surface.
 */
import { Fragment, type ReactNode } from 'react';

function renderInline(text: string): ReactNode {
  // Split on **bold** spans, keeping the delimiters out of the output.
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function Markdown({ source, dir }: { source: string; dir?: 'ltr' | 'rtl' }) {
  const blocks = source.split(/\n{2,}/);
  return (
    <div dir={dir} className="space-y-3 text-sm leading-relaxed text-navy dark:text-offwhite">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith('### '))
          return (
            <h3 key={i} className="font-display text-base font-semibold">
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        if (trimmed.startsWith('## '))
          return (
            <h2 key={i} className="font-display text-lg font-bold">
              {renderInline(trimmed.slice(3))}
            </h2>
          );
        if (trimmed.startsWith('# '))
          return (
            <h1 key={i} className="font-display text-xl font-bold">
              {renderInline(trimmed.slice(2))}
            </h1>
          );
        return (
          <p key={i} className="whitespace-pre-line text-slate">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
