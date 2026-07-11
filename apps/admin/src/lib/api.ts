const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : `API error ${status}`,
    );
  }
}

// One refresh at a time: parallel 401s share the same attempt (refresh tokens rotate).
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  refreshInFlight ??= fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    credentials: 'include',
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/** Should a 401 on this path trigger a token refresh + retry? */
function refreshable(path: string): boolean {
  return path === '/auth/me' || !path.startsWith('/auth/');
}

/**
 * Admin JSON API client. The 15-minute access cookie is renewed transparently:
 * on a 401 we call /auth/refresh (rotating 30-day cookie) once and retry.
 */
export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
  isRetry = false,
): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  });
  if (res.status === 401 && !isRetry && refreshable(path) && (await tryRefresh())) {
    return api<T>(path, opts, true);
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
