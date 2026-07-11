'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  CheckCheck,
  Clock,
  CornerUpLeft,
  Image as ImageIcon,
  Pencil,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { Card, cn } from '@sindbad/ui';
import { api, ApiError, apiUpload, mediaUrl } from '@/lib/api';
import { useMe } from '@/lib/use-me';
import { useOnline } from '@/lib/use-online';
import { useChatSocket } from '@/lib/use-chat-socket';
import {
  enqueue as outboxEnqueue,
  flushChatOutbox,
  makeLocalId,
  pendingFor,
  OUTBOX_FLUSHED_EVENT,
  type OutboxMessage,
} from '@/lib/chat-outbox';
import type { ChatMessage } from '@/lib/chat-types';

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: threadId } = use(params);
  const t = useTranslations();
  const { me } = useMe();
  const online = useOnline();
  const myAccountId = me?.memberships[0]?.account.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<OutboxMessage[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshPending = useCallback(() => setPending(pendingFor(threadId)), [threadId]);

  const load = useCallback(() => {
    api<ChatMessage[]>(`/chat/threads/${threadId}/messages`)
      .then(setMessages)
      .catch(() => undefined);
    api(`/chat/threads/${threadId}/read`, { body: {} }).catch(() => undefined);
  }, [threadId]);

  useEffect(() => {
    if (me) {
      load();
      refreshPending();
    }
  }, [me, load, refreshPending]);

  // Flush this thread's queued messages whenever connectivity returns (and on
  // first load). Delivery/refresh of the UI is driven by OUTBOX_FLUSHED_EVENT
  // below, so it also covers flushes performed by the app-wide flusher.
  useEffect(() => {
    if (me && online) void flushChatOutbox(threadId).then(refreshPending);
  }, [me, online, threadId, refreshPending]);

  useEffect(() => {
    const onFlushed = () => {
      refreshPending();
      load();
    };
    window.addEventListener(OUTBOX_FLUSHED_EVENT, onFlushed);
    return () => window.removeEventListener(OUTBOX_FLUSHED_EVENT, onFlushed);
  }, [load, refreshPending]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  // Live updates for this thread.
  useChatSocket({
    'message.new': (payload) => {
      if ((payload as { threadId: string }).threadId === threadId) load();
    },
    'message.updated': (payload) => {
      if ((payload as { threadId: string }).threadId === threadId) load();
    },
    'thread.read': (payload) => {
      if ((payload as { threadId: string }).threadId === threadId) load();
    },
    'thread.delivered': (payload) => {
      if ((payload as { threadId: string }).threadId === threadId) load();
    },
  });

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');
    if (editing) {
      // Edits require connectivity (15-min server window); skip silently if offline.
      await api(`/chat/messages/${editing.id}/edit`, { body: { body } }).catch(() => undefined);
      setEditing(null);
      load();
      return;
    }

    const reply = replyTo;
    setReplyTo(null);

    const queue = () => {
      outboxEnqueue({
        localId: makeLocalId(),
        threadId,
        body,
        replyToId: reply?.id,
        createdAt: new Date().toISOString(),
      });
      refreshPending();
    };

    if (!online) {
      queue();
      return;
    }
    try {
      await api(`/chat/threads/${threadId}/messages`, { body: { body, replyToId: reply?.id } });
      load();
    } catch (e) {
      if (e instanceof ApiError) {
        // The server rejected the message deliberately (e.g. no longer allowed to
        // chat) — don't queue a doomed retry; put the draft back instead.
        setText(body);
        setReplyTo(reply);
      } else {
        queue(); // network failure — deliver when connectivity returns
      }
    }
  }

  async function sendPhoto(file: File) {
    const msg = await api<{ id: string }>(`/chat/threads/${threadId}/messages`, {
      body: { body: undefined },
    }).catch(() => null);
    if (!msg) return;
    const form = new FormData();
    form.set('file', file);
    form.set('context', 'CHAT');
    form.set('subjectId', msg.id);
    try {
      await apiUpload('/media/upload', form);
    } catch {
      // Don't leave an empty orphan message behind if the upload failed.
      await api(`/chat/messages/${msg.id}/unsend`, { body: {} }).catch(() => undefined);
    }
    load();
  }

  async function unsend(m: ChatMessage) {
    await api(`/chat/messages/${m.id}/unsend`, { body: {} }).catch(() => undefined);
    load();
  }

  if (me === null)
    return <Card className="mt-8 p-6 text-center text-sm text-slate">{t('account.pleaseLogin')}</Card>;

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <div className="flex-1 space-y-2 pb-4">
        {messages.map((m) => {
          const mine = m.senderAccountId === myAccountId;
          const editable =
            mine && !m.unsent && Date.now() - new Date(m.createdAt).getTime() < EDIT_WINDOW_MS;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'group max-w-[80%] rounded-panel px-3 py-2 text-sm',
                  mine
                    ? 'bg-royal text-white'
                    : 'border border-slate-border bg-white dark:border-slate-dark dark:bg-slate-dark/40',
                )}
              >
                {m.replyTo ? (
                  <div
                    className={cn(
                      'mb-1 rounded border-s-2 ps-2 text-[11px] opacity-80',
                      mine ? 'border-white/60' : 'border-royal',
                    )}
                  >
                    {m.replyTo.unsentAt ? t('chat.unsent') : m.replyTo.body}
                  </div>
                ) : null}

                {m.unsent ? (
                  <span className="italic opacity-70">{t('chat.unsent')}</span>
                ) : (
                  <>
                    {m.photos?.map((pid) => (
                      <a key={pid} href={mediaUrl(pid, 'md')} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaUrl(pid, 'thumb')}
                          alt=""
                          className="mb-1 max-h-48 rounded-button object-cover"
                        />
                      </a>
                    ))}
                    {m.body ? <div>{m.body}</div> : null}
                  </>
                )}

                <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-70">
                  {m.editedAt ? <span>{t('chat.edited')}</span> : null}
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {mine && !m.unsent ? (
                    m.receipt === 'READ' ? (
                      <CheckCheck className="h-3.5 w-3.5 text-sky" />
                    ) : m.receipt === 'DELIVERED' ? (
                      <CheckCheck className="h-3.5 w-3.5" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )
                  ) : null}
                </div>

                {!m.unsent ? (
                  <div className="mt-1 hidden gap-2 text-[11px] group-hover:flex">
                    <button type="button" onClick={() => setReplyTo(m)} aria-label="reply">
                      <CornerUpLeft className="h-3 w-3" />
                    </button>
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(m);
                          setText(m.body ?? '');
                        }}
                        aria-label="edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    ) : null}
                    {mine ? (
                      <button type="button" onClick={() => unsend(m)} aria-label="unsend">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        {pending.map((m) => (
          <div key={m.localId} className="flex justify-end">
            <div className="max-w-[80%] rounded-panel bg-royal/70 px-3 py-2 text-sm text-white">
              <div>{m.body}</div>
              <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-80">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>{t('chat.queued')}</span>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-16 -mx-4 border-t border-slate-border bg-white px-4 py-2 dark:border-slate-dark dark:bg-navy">
        {(replyTo || editing) && (
          <div className="mb-1.5 flex items-center justify-between rounded-button bg-tint-blue px-2.5 py-1.5 text-xs dark:bg-royal/15">
            <span className="truncate text-royal">
              {editing ? t('chat.editing') : `${t('chat.replyingTo')}: ${replyTo?.body ?? ''}`}
            </span>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setEditing(null);
                setText('');
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && sendPhoto(e.target.files[0])}
          />
          <button type="button" onClick={() => fileRef.current?.click()} aria-label="photo">
            <ImageIcon className="h-5 w-5 text-slate" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && send()}
            placeholder={t('chat.messagePlaceholder')}
            className="flex-1 rounded-pill border border-slate-border bg-offwhite px-4 py-2 text-sm dark:border-slate-dark dark:bg-slate-dark/40"
          />
          <button
            type="button"
            onClick={send}
            aria-label="send"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-royal text-white"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
