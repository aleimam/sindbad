import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../money/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CredibilityService } from './credibility.service';

const SOCIAL_KEYS = ['FACEBOOK', 'INSTAGRAM'];

@Injectable()
export class VerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly credibility: CredibilityService,
  ) {}

  /** All active types + the caller's current status per type (Account → Verification). */
  async typesWithStatus(accountId: string) {
    const [types, mine] = await Promise.all([
      this.prisma.verificationType.findMany({ where: { active: true }, orderBy: { key: 'asc' } }),
      this.prisma.verification.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return types.map((t) => ({
      ...t,
      latest: mine.find((v) => v.typeId === t.id) ?? null,
    }));
  }

  /**
   * Request a verification: the fee is charged from the wallet immediately and is
   * KEPT even on rejection (decision 2026-06-25). Attachments go via /media (KYC).
   */
  async request(accountId: string, typeKey: string, details?: string) {
    const type = await this.prisma.verificationType.findUnique({ where: { key: typeKey } });
    if (!type?.active) throw new NotFoundException('Verification type not found');

    const open = await this.prisma.verification.findFirst({
      where: { accountId, typeId: type.id, status: { in: ['NEW', 'STUDYING', 'NEEDS_REVIEW'] } },
    });
    if (open) throw new BadRequestException('A request for this detail is already in progress');
    const verified = await this.prisma.verification.findFirst({
      where: { accountId, typeId: type.id, status: 'VERIFIED' },
    });
    if (verified) throw new BadRequestException('Already verified');

    // Charge the (admin-set) price — verification fees are platform revenue.
    if (type.priceUsd > 0) {
      const walletId = await this.ledger.ensureWallet(accountId);
      await this.ledger.post({
        type: 'ADMIN_ADJUSTMENT',
        note: `Verification fee: ${type.key}`,
        entries: [
          { walletId, currency: 'USD', amountMinor: -type.priceUsd },
          { systemAccount: 'PLATFORM_REVENUE', currency: 'USD', amountMinor: type.priceUsd },
        ],
      });
    }

    // Social accounts use the code-in-profile method (decision F3).
    const socialCode = SOCIAL_KEYS.includes(type.key)
      ? `SINDBAD-${randomInt(100000, 999999)}`
      : null;

    return this.prisma.verification.create({
      data: { accountId, typeId: type.id, details, socialCode },
      include: { type: true },
    });
  }

  mine(accountId: string) {
    return this.prisma.verification.findMany({
      where: { accountId },
      include: { type: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin review ──

  queue(status?: 'NEW' | 'STUDYING' | 'NEEDS_REVIEW') {
    return this.prisma.verification.findMany({
      where: { status: status ?? { in: ['NEW', 'STUDYING'] } },
      include: { type: true, account: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decide(
    verificationId: string,
    staffUserId: string,
    status: 'STUDYING' | 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED',
  ) {
    const verification = await this.prisma.verification.findUnique({
      where: { id: verificationId },
      include: { type: true },
    });
    if (!verification) throw new NotFoundException('Verification not found');
    if (['VERIFIED', 'REJECTED'].includes(verification.status))
      throw new BadRequestException('Already finalised');

    const updated = await this.prisma.verification.update({
      where: { id: verificationId },
      data: {
        status,
        points: status === 'VERIFIED' ? verification.type.credibilityPoints : 0,
        decidedByUserId: ['VERIFIED', 'REJECTED'].includes(status) ? staffUserId : undefined,
        decidedAt: ['VERIFIED', 'REJECTED'].includes(status) ? new Date() : undefined,
      },
    });

    if (status === 'VERIFIED') {
      // Verification points hold while verified — not time-weighted (docs/02 §5).
      await this.credibility.addEvent(
        verification.accountId,
        'VERIFICATION',
        verification.type.credibilityPoints,
        { timeWeighted: false, refId: verificationId, recomputeNow: true },
      );
    }
    void this.notifications.notify(
      verification.accountId,
      'ADMIN',
      status === 'VERIFIED'
        ? `Your ${verification.type.nameEn} verification was approved`
        : status === 'REJECTED'
          ? `Your ${verification.type.nameEn} verification was rejected`
          : `Your ${verification.type.nameEn} verification needs more information`,
      { verificationId },
    );
    return updated;
  }
}
