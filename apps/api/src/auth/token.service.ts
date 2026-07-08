import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';

export interface AccessTokenPayload {
  sub: string; // userId
  sid: string; // sessionId
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwt.sign(
      { ...payload },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<number>('jwt.accessTtlSec') ?? 900,
      },
    );
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token, {
      secret: this.config.get<string>('jwt.accessSecret'),
    });
  }

  /** Opaque refresh token: random 256-bit value; only its SHA-256 hash is stored. */
  generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: TokenService.hashRefreshToken(token) };
  }

  static hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Short-lived token bridging password success → TOTP verification (admin 2FA step-up). */
  signPending2fa(userId: string): string {
    return this.jwt.sign(
      { sub: userId, purpose: '2fa' },
      { secret: this.config.get<string>('jwt.accessSecret'), expiresIn: 300 },
    );
  }

  verifyPending2fa(token: string): { sub: string } {
    const payload = this.jwt.verify<{ sub: string; purpose?: string }>(token, {
      secret: this.config.get<string>('jwt.accessSecret'),
    });
    if (payload.purpose !== '2fa') throw new Error('Wrong token purpose');
    return { sub: payload.sub };
  }
}
