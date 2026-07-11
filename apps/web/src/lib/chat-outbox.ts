'use client';

import { api, ApiError } from './api';

/**
 * Offline outbox for chat: text messages composed while offline (or that fail
 * with a retriable error) are persisted to localStorage and flushed when
 * connectivity returns. Photos are intentionally not queued (they need a live
 * multipart upload).
 *
 * Correctness properties:
 *  • Claim-based flush — each message is REMOVED from storage before sending and
 *    restored only on a retriable failure, so overlapping flushes can't send the
 *    same message twice.
 *  • Serialized — flushes are chained on a module-level promise, preserving send
 *    order and preventing interleaving.
 *  • No poison queue — the send callback classifies failures: 'drop' (permanent
 *    server rejection, e.g. 400/403) discards the message; 'retry' (network/5xx)
 *    restores it at the front and stops the batch (the link is likely down).
 *  • Cross-thread — flush covers every thread by default, so messages queued in
 *    one conversation still send while the user is elsewhere in the app.
 */
export interface OutboxMessage {
  localId: string;
  threadId: string;
  body: string;
  replyToId?: string;
  createdAt: string;
}

export type SendOutcome = 'sent' | 'retry' | 'drop';

/** Fired on window whenever a flush delivers at least one message. */
export const OUTBOX_FLUSHED_EVENT = 'sindbad:chat-outbox-flushed';

const KEY = 'sindbad:chat-outbox';

function readAll(): OutboxMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as OutboxMessage[];
  } catch {
    return [];
  }
}

function writeAll(list: OutboxMessage[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function makeLocalId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export function enqueue(msg: OutboxMessage): void {
  writeAll([...readAll(), msg]);
}

export function pendingFor(threadId: string): OutboxMessage[] {
  return readAll().filter((m) => m.threadId === threadId);
}

function remove(localId: string): void {
  writeAll(readAll().filter((m) => m.localId !== localId));
}

function restoreAtFront(msg: OutboxMessage): void {
  const rest = readAll().filter((m) => m.localId !== msg.localId);
  writeAll([msg, ...rest]);
}

// Serialize flushes: callers chain onto the previous run instead of overlapping.
let chain: Promise<number> = Promise.resolve(0);

/**
 * Flush queued messages — every thread by default, or a single thread. Returns
 * how many were delivered. Dispatches {@link OUTBOX_FLUSHED_EVENT} when > 0 so
 * open conversation views can refresh regardless of which caller flushed.
 */
export function flush(
  send: (m: OutboxMessage) => Promise<SendOutcome>,
  threadId?: string,
): Promise<number> {
  const run = async (): Promise<number> => {
    const batch = threadId ? pendingFor(threadId) : readAll();
    let sent = 0;
    for (const m of batch) {
      remove(m.localId); // claim before sending — concurrent flushers can't double-send
      // eslint-disable-next-line no-await-in-loop -- preserve send order
      const outcome = await send(m);
      if (outcome === 'sent') {
        sent += 1;
      } else if (outcome === 'retry') {
        restoreAtFront(m); // keep it, keep order — and stop: the link is likely down
        break;
      } else {
        // 'drop' — the server rejected it permanently; keeping it would poison the
        // queue with an endless retry.
        console.warn('[chat-outbox] message permanently rejected — dropped', m.localId);
      }
    }
    if (sent > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OUTBOX_FLUSHED_EVENT, { detail: { sent } }));
    }
    return sent;
  };
  chain = chain.then(run, run);
  return chain;
}

/** Transient statuses that must NOT drop a message: auth lapse, timeout, throttle. */
const RETRIABLE_HTTP = new Set([401, 408, 429]);

/**
 * Flush using the real chat API. Failure classification: deliberate server
 * rejections (400/403/404…) are dropped so they can't poison the queue; network
 * errors, 5xx, and transient statuses are kept for retry.
 */
export function flushChatOutbox(threadId?: string): Promise<number> {
  return flush(
    (m) =>
      api(`/chat/threads/${m.threadId}/messages`, {
        body: { body: m.body, replyToId: m.replyToId },
      })
        .then((): SendOutcome => 'sent')
        .catch((e: unknown): SendOutcome =>
          e instanceof ApiError && e.status >= 400 && e.status < 500 && !RETRIABLE_HTTP.has(e.status)
            ? 'drop'
            : 'retry',
        ),
    threadId,
  );
}
