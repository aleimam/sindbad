'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

export interface StaffContext {
  isStaff: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
}

/** Loads the staff context; redirects to /login when unauthenticated. */
export function useStaff() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffContext | undefined>(undefined);

  useEffect(() => {
    api<StaffContext>('/admin/auth/me/permissions')
      .then((ctx) => {
        if (!ctx.isStaff) router.replace('/login');
        else setStaff(ctx);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  const can = (permission: string) =>
    Boolean(staff && (staff.isSuperAdmin || staff.permissions.includes(permission)));

  return { staff, can };
}
