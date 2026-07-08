'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export interface Me {
  id: string;
  email: string | null;
  phone: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  memberships: Array<{
    role: 'OWNER' | 'MANAGER';
    account: { id: string; type: 'PERSONAL' | 'COMMERCIAL'; displayName: string };
  }>;
}

const AUTH_EVENT = 'sb:auth';

/** undefined = loading · null = signed out · Me = signed in */
export function useMe() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  const refresh = useCallback(() => {
    api<Me>('/auth/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(AUTH_EVENT, refresh);
    return () => window.removeEventListener(AUTH_EVENT, refresh);
  }, [refresh]);

  return { me, refresh };
}

export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}
