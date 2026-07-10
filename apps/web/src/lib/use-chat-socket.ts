'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type ChatEvent =
  | 'message.new'
  | 'message.updated'
  | 'thread.read'
  | 'thread.delivered';

/** One shared socket on the /chat namespace, authenticated by the httpOnly cookie. */
export function useChatSocket(handlers: Partial<Record<ChatEvent, (payload: unknown) => void>>) {
  const ref = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = io(`${API_URL}/chat`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    ref.current = socket;

    const events: ChatEvent[] = ['message.new', 'message.updated', 'thread.read', 'thread.delivered'];
    for (const event of events) {
      socket.on(event, (payload: unknown) => handlersRef.current[event]?.(payload));
    }
    return () => {
      socket.disconnect();
      ref.current = null;
    };
  }, []);

  return ref;
}
