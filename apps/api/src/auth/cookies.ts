import type { Response } from 'express';

export const ACCESS_COOKIE = 'sb_access';
export const REFRESH_COOKIE = 'sb_refresh';

const FIFTEEN_MIN = 15 * 60 * 1000;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/** Web clients get httpOnly cookies; mobile clients read the JSON body instead. */
export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  secure: boolean,
) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: FIFTEEN_MIN,
    path: '/',
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: THIRTY_DAYS,
    path: '/api/auth',
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}
