import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { LoginInput } from '@sindbad/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, type SessionMeta } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';
import { generateTotpSecret, otpauthUri, verifyTotp } from './totp';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  /**
   * Staff login. With 2FA enrolled → returns a pending challenge (no tokens yet).
   * Without enrollment → logs in but tells the client enrollment is required.
   */
  async login(input: LoginInput, meta: SessionMeta) {
    const user = await this.auth.validateCredentials(input.identifier, input.password);
    if (!user.isStaff) throw new ForbiddenException('Staff only');

    if (user.totpEnabledAt) {
      return { pending2fa: true as const, challengeToken: this.tokens.signPending2fa(user.id) };
    }
    const tokens = await this.auth.issueTokensForUser(user.id, meta);
    return { pending2fa: false as const, mustEnroll2fa: true, ...tokens };
  }

  async verify2fa(challengeToken: string, code: string, meta: SessionMeta) {
    let userId: string;
    try {
      userId = this.tokens.verifyPending2fa(challengeToken).sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA challenge');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isStaff || !user.totpSecret || !user.totpEnabledAt)
      throw new UnauthorizedException('2FA not enrolled');
    if (!verifyTotp(user.totpSecret, code)) throw new UnauthorizedException('Wrong code');

    return this.auth.issueTokensForUser(user.id, meta);
  }

  /** Step 1 of enrollment: issue a secret (stored, but inactive until verified). */
  async setup2fa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isStaff) throw new ForbiddenException('Staff only');
    if (user.totpEnabledAt) throw new BadRequestException('2FA already enabled');

    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabledAt: null },
    });
    const label = user.email ?? user.phone ?? userId;
    return { secret, otpauthUri: otpauthUri(secret, label) };
  }

  /** Step 2: verify the first code — 2FA becomes mandatory for future logins. */
  async enable2fa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException('Run setup first');
    if (user.totpEnabledAt) throw new BadRequestException('2FA already enabled');
    if (!verifyTotp(user.totpSecret, code)) throw new BadRequestException('Wrong code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabledAt: new Date() },
    });
    return { ok: true };
  }
}
