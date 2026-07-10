'use client';

/**
 * Offline outbox for chat: text messages composed while offline (or that fail to
 * send) are persisted to localStorage and flushed when connectivity returns.
 * Photos are intentionally not queued (they need a live multipart upload).
 */
export interface OutboxMessage {
  localId: string;
  threadId: string;
  body: string;
  replyToId?: string;
  createdAt: string;
}

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

export function remove(localId: string): void {
  writeAll(readAll().filter((m) => m.localId !== localId));
}

/** Attempt every queued message for a thread; keep the ones that still fail. */
export async function flush(
  threadId: string,
  send: (m: OutboxMessage) => Promise<boolean>,
): Promise<number> {
  let sent = 0;
  for (const m of pendingFor(threadId)) {
    // eslint-disable-next-line no-await-in-loop -- preserve send order
    if (await send(m)) {
      remove(m.localId);
      sent += 1;
    }
  }
  return sent;
}
