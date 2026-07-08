import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'node:crypto';
import type { OtpChannel, OtpPurpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_PROVIDER, SMS_PROVIDER } from '../messaging/messaging';
import type { EmailProvider, SmsProvider } from '../messaging/messaging';

export const OTP_TTL_MINUTES = 10;

export function hashOtpCode(challengeId: string, code: string): string {
  return createHash('sha256').update(`${challengeId}:${code}`).digest('hex');
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'consumed' | 'expired' | 'too_many_attempts' | 'mismatch' };

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  /**
   * Create a challenge and send the code over the destination's channel.
   * NOTE (spec): user-requested resends must use the ALTERNATE provider — implemented
   * when the real SMS providers land (Phase 5); the dev provider just logs.
   */
  async issue(params: {
    destination: string;
    channel: OtpChannel;
    purpose: OtpPurpose;
    userId?: string;
  }): Promise<{ challengeId: string; devCode?: string }> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        userId: params.userId,
        destination: params.destination,
        channel: params.channel,
        purpose: params.purpose,
        codeHash: '', // set below (hash includes the challenge id)
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
      },
    });
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { codeHash: hashOtpCode(challenge.id, code) },
    });

    const body = `Sindbad code: ${code} (valid ${OTP_TTL_MINUTES} minutes)`;
    if (params.channel === 'SMS') await this.sms.sendSms(params.destination, body);
    else await this.email.sendEmail(params.destination, 'Your Sindbad code', body);

    // Echo the code in non-production so flows are testable before real providers exist.
    const devEcho = this.config.get<string>('env') !== 'production';
    return { challengeId: challenge.id, ...(devEcho ? { devCode: code } : {}) };
  }

  /** Verify and consume a challenge (single use, attempt-limited, time-limited). */
  async verify(challengeId: string, code: string, purpose: OtpPurpose): Promise<OtpVerifyResult> {
    const challenge = await this.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.purpose !== purpose) return { ok: false, reason: 'not_found' };
    if (challenge.consumedAt) return { ok: false, reason: 'consumed' };
    if (challenge.expiresAt < new Date()) return { ok: false, reason: 'expired' };
    if (challenge.attempts >= challenge.maxAttempts)
      return { ok: false, reason: 'too_many_attempts' };

    if (challenge.codeHash !== hashOtpCode(challenge.id, code)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      return { ok: false, reason: 'mismatch' };
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return { ok: true };
  }
}
