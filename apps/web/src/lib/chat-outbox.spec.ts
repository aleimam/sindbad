// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Browser shims for the module under test (localStorage + window events).
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as unknown as Storage);
vi.stubGlobal('window', {
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

// Mock the API transport; keep the real ApiError class for instanceof checks.
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return { ...actual, api: vi.fn() };
});

import { api, ApiError } from './api';
import { enqueue, flush, flushChatOutbox, makeLocalId, pendingFor, type OutboxMessage } from './chat-outbox';

const apiMock = vi.mocked(api);

function msg(threadId: string, body: string): OutboxMessage {
  return { localId: makeLocalId(), threadId, body, createdAt: new Date().toISOString() };
}

beforeEach(() => {
  store.clear();
  apiMock.mockReset();
});

describe('outbox queue', () => {
  it('enqueues and reads back per thread', () => {
    enqueue(msg('t1', 'a'));
    enqueue(msg('t2', 'b'));
    enqueue(msg('t1', 'c'));
    expect(pendingFor('t1').map((m) => m.body)).toEqual(['a', 'c']);
    expect(pendingFor('t2').map((m) => m.body)).toEqual(['b']);
  });
});

describe('flush semantics', () => {
  it('sends in order and removes sent messages', async () => {
    enqueue(msg('t1', 'one'));
    enqueue(msg('t1', 'two'));
    const sent: string[] = [];
    const n = await flush(async (m) => {
      sent.push(m.body);
      return 'sent';
    });
    expect(n).toBe(2);
    expect(sent).toEqual(['one', 'two']);
    expect(pendingFor('t1')).toHaveLength(0);
  });

  it('drop discards permanently (no poison queue)', async () => {
    enqueue(msg('t1', 'rejected'));
    const n = await flush(async () => 'drop');
    expect(n).toBe(0);
    expect(pendingFor('t1')).toHaveLength(0);
  });

  it('retry restores at the front and stops the batch (order preserved)', async () => {
    enqueue(msg('t1', 'first'));
    enqueue(msg('t1', 'second'));
    const attempted: string[] = [];
    const n = await flush(async (m) => {
      attempted.push(m.body);
      return 'retry';
    });
    expect(n).toBe(0);
    expect(attempted).toEqual(['first']); // stopped after the first retriable failure
    expect(pendingFor('t1').map((m) => m.body)).toEqual(['first', 'second']);
  });

  it('overlapping flushes never send the same message twice', async () => {
    enqueue(msg('t1', 'only-once'));
    const sends: string[] = [];
    const slowSend = async (m: OutboxMessage) => {
      sends.push(m.body);
      await new Promise((r) => setTimeout(r, 20));
      return 'sent' as const;
    };
    // Fire two flushes without awaiting the first — they must serialize.
    const [a, b] = await Promise.all([flush(slowSend), flush(slowSend)]);
    expect(sends).toEqual(['only-once']);
    expect(a + b).toBe(1);
  });

  it('flushes across threads by default, single thread when scoped', async () => {
    enqueue(msg('tA', 'a'));
    enqueue(msg('tB', 'b'));
    const sent: string[] = [];
    await flush(async (m) => {
      sent.push(`${m.threadId}:${m.body}`);
      return 'sent';
    }, 'tA');
    expect(sent).toEqual(['tA:a']);
    expect(pendingFor('tB')).toHaveLength(1);
  });
});

describe('flushChatOutbox failure classification', () => {
  it('drops on a deliberate 4xx rejection', async () => {
    enqueue(msg('t1', 'forbidden'));
    apiMock.mockRejectedValue(new ApiError(403, { message: 'blocked' }));
    await flushChatOutbox();
    expect(pendingFor('t1')).toHaveLength(0); // dropped, not retried forever
  });

  it('keeps the message on a network error', async () => {
    enqueue(msg('t1', 'offline'));
    apiMock.mockRejectedValue(new TypeError('fetch failed'));
    await flushChatOutbox();
    expect(pendingFor('t1')).toHaveLength(1);
  });

  it('keeps the message on transient statuses (401/429) and 5xx', async () => {
    enqueue(msg('t1', 'transient'));
    for (const status of [401, 429, 503]) {
      apiMock.mockRejectedValueOnce(new ApiError(status, {}));
      // eslint-disable-next-line no-await-in-loop
      await flushChatOutbox();
      expect(pendingFor('t1'), `status ${status}`).toHaveLength(1);
    }
  });
});
