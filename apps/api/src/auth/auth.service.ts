import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isEmail,
  normalizeEmail,
  normalizeIdentifier,
  normalizePhone,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type VerifyOtpInput,
} from '@sindbad/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { OtpService } from './otp.service';

const REFRESH_TTL_DAYS = 30;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    private readonly config: ConfigService,
  ) {}

  // ── Registration ──────────────────────────────────────────────────────────

  async register(input: RegisterInput) {
    const email = input.email ? normalizeEmail(input.email) : undefined;
    const phone = input.phone ? normalizePhone(input.phone) : undefined;

    // Blocked identities cannot re-register (docs/02 §2).
    if (phone) {
      const blocked = await this.prisma.blockedIdentity.findUnique({
        where: { kind_value: { kind: 'PHONE', value: phone } },
      });
      if (blocked) throw new ForbiddenException('This phone number cannot be used');
    }

    if (email && (await this.prisma.user.findUnique({ where: { email } })))
      throw new ConflictException('Email already registered');
    if (phone && (await this.prisma.user.findUnique({ where: { phone } })))
      throw new ConflictException('Phone already registered');

    const passwordHash = await this.passwords.hash(input.password);

    // Placeholder display name; the real one is set in the profile flow (admin-approved).
    const displayName = `user_${Math.random().toString(36).slice(2, 8)}`;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email, phone, passwordHash } });
      const account = await tx.account.create({ data: { type: 'PERSONAL', displayName } });
      await tx.accountMember.create({
        data: { userId: created.id, accountId: account.id, role: 'OWNER' },
      });
      return created;
    });

    // Verify the registration contact by OTP (spec: Users).
    const destination = email ?? phone!;
    const challenge = await this.otp.issue({
      destination,
      channel: email ? 'EMAIL' : 'SMS',
      purpose: 'REGISTER',
      userId: user.id,
    });

    return { userId: user.id, challengeId: challenge.challengeId, devCode: challenge.devCode };
  }

  /** Verify the registration OTP, mark the contact verified, and log the user in. */
  async verifyRegistration(input: VerifyOtpInput, meta: SessionMeta) {
    const challenge = await this.prisma.otpChallenge.findUnique({
      where: { id: input.challengeId },
    });
    const result = await this.otp.verify(input.challengeId, input.code, 'REGISTER');
    if (!result.ok) throw new BadRequestException(`OTP invalid: ${result.reason}`);
    if (!challenge?.userId) throw new BadRequestException('Challenge has no user');

    const verifiedField = isEmail(challenge.destination)
      ? { emailVerifiedAt: new Date() }
      : { phoneVerifiedAt: new Date() };
    const user = await this.prisma.user.update({
      where: { id: challenge.userId },
      data: verifiedField,
    });

    return this.createSession(user.id, meta);
  }

  // ── Login / sessions ──────────────────────────────────────────────────────

  async login(input: LoginInput, meta: SessionMeta) {
    const lookup = normalizeIdentifier(input.identifier);
    const user = await this.prisma.user.findUnique({
      where: lookup.email ? { email: lookup.email } : { phone: lookup.phone! },
    });
    if (!user || !(await this.passwords.verify(user.passwordHash, input.password)))
      throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'BLOCKED')
      throw new ForbiddenException('Account blocked'); // ongoing-deals-only access lands with the deals module

    return this.createSession(user.id, meta);
  }

  async refresh(refreshToken: string, meta: SessionMeta) {
    const hash = TokenService.hashRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    if (!session || session.revokedAt || session.expiresAt < new Date())
      throw new UnauthorizedException('Invalid refresh token');

    // Rotate: same session row, new refresh secret.
    const next = this.tokens.generateRefreshToken();
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: next.hash,
        lastUsedAt: new Date(),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    const accessToken = this.tokens.signAccessToken({ sub: session.userId, sid: session.id });
    return { accessToken, refreshToken: next.token, sessionId: session.id } satisfies IssuedTokens;
  }

  async logout(refreshToken: string) {
    const hash = TokenService.hashRefreshToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        status: true,
        isStaff: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            account: { select: { id: true, type: true, displayName: true } },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  // ── Password reset ────────────────────────────────────────────────────────

  async forgotPassword(input: ForgotPasswordInput) {
    const lookup = normalizeIdentifier(input.identifier);
    const user = await this.prisma.user.findUnique({
      where: lookup.email ? { email: lookup.email } : { phone: lookup.phone! },
    });
    // Do not reveal whether the identifier exists.
    if (!user) return { challengeId: null };

    const destination = lookup.email ?? lookup.phone!;
    const challenge = await this.otp.issue({
      destination,
      channel: lookup.email ? 'EMAIL' : 'SMS',
      purpose: 'PASSWORD_RESET',
      userId: user.id,
    });
    return { challengeId: challenge.challengeId, devCode: challenge.devCode };
  }

  async resetPassword(input: ResetPasswordInput) {
    const challenge = await this.prisma.otpChallenge.findUnique({
      where: { id: input.challengeId },
    });
    const result = await this.otp.verify(input.challengeId, input.code, 'PASSWORD_RESET');
    if (!result.ok) throw new BadRequestException(`OTP invalid: ${result.reason}`);
    if (!challenge?.userId) throw new BadRequestException('Challenge has no user');

    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: challenge.userId }, data: { passwordHash } }),
      // Revoke every session — the account may have been compromised.
      this.prisma.session.updateMany({
        where: { userId: challenge.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async createSession(userId: string, meta: SessionMeta): Promise<IssuedTokens> {
    const refresh = this.tokens.generateRefreshToken();
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: refresh.hash,
        deviceLabel: meta.deviceLabel,
        ip: meta.ip,
        userAgent: meta.userAgent,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    const accessToken = this.tokens.signAccessToken({ sub: userId, sid: session.id });
    return { accessToken, refreshToken: refresh.token, sessionId: session.id };
  }
}

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
  deviceLabel?: string;
}
