import { describe, expect, it } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';

const fakeConfig = {
  get: (key: string) =>
    ({ 'jwt.accessSecret': 'test-secret', 'jwt.accessTtlSec': 900 } as Record<string, unknown>)[
      key
    ],
} as unknown as ConfigService;

const service = new TokenService(new JwtService({}), fakeConfig);

describe('TokenService', () => {
  it('signs and verifies an access token round-trip', () => {
    const token = service.signAccessToken({ sub: 'user1', sid: 'sess1' });
    const payload = service.verifyAccessToken(token);
    expect(payload.sub).toBe('user1');
    expect(payload.sid).toBe('sess1');
  });

  it('rejects tampered tokens', () => {
    const token = service.signAccessToken({ sub: 'user1', sid: 'sess1' });
    expect(() => service.verifyAccessToken(token + 'x')).toThrow();
  });

  it('generates unique refresh tokens with matching hashes', () => {
    const a = service.generateRefreshToken();
    const b = service.generateRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(TokenService.hashRefreshToken(a.token)).toBe(a.hash);
    expect(a.hash).toHaveLength(64); // sha256 hex
  });
});
