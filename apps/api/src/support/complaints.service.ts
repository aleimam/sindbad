import { Injectable, NotFoundException } from '@nestjs/common';
import type { ComplaintTarget, ModerationKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CredibilityService } from '../trust/credibility.service';
import { NotificationsService } from '../notifications/notifications.service';
import { holdUntilFrom } from './moderation';

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credibility: CredibilityService,
    private readonly notifications: NotificationsService,
  ) {}

  raise(
    accountId: string,
    input: { targetType: ComplaintTarget; targetId: string; topic: string; details: string },
  ) {
    return this.prisma.complaint.create({ data: { raisedByAccountId: accountId, ...input } });
  }

  mine(accountId: string) {
    return this.prisma.complaint.findMany({
      where: { raisedByAccountId: accountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin ──

  queue(status?: 'NEW' | 'UNDER_REVIEW') {
    return this.prisma.complaint.findMany({
      where: { status: status ?? { in: ['NEW', 'UNDER_REVIEW'] } },
      include: { actions: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async setStatus(id: string, staffUserId: string, status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED', decision?: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');
    const updated = await this.prisma.complaint.update({
      where: { id },
      data: {
        status,
        decision,
        assignedUserId: staffUserId,
        decidedByUserId: ['RESOLVED', 'DISMISSED'].includes(status) ? staffUserId : undefined,
        decidedAt: ['RESOLVED', 'DISMISSED'].includes(status) ? new Date() : undefined,
      },
    });
    if (['RESOLVED', 'DISMISSED'].includes(status)) {
      void this.notifications.notify(complaint.raisedByAccountId, 'ADMIN', 'Your complaint was reviewed', {
        complaintId: id,
      });
    }
    return updated;
  }

  /** Apply a punishment (spec: deduct points / hold membership / block). */
  async punish(
    input: {
      complaintId?: string;
      accountId: string;
      kind: ModerationKind;
      points?: number;
      holdDays?: number;
      reason: string;
    },
    staffUserId: string,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: input.accountId },
      include: { members: { select: { userId: true } } },
    });
    if (!account) throw new NotFoundException('Account not found');

    const holdUntil =
      input.kind === 'HOLD_MEMBERSHIP' ? holdUntilFrom(new Date(), input.holdDays) : null;

    await this.prisma.moderationAction.create({
      data: {
        complaintId: input.complaintId,
        accountId: input.accountId,
        kind: input.kind,
        points: input.kind === 'DEDUCT_CREDIBILITY' ? input.points : null,
        holdUntil,
        reason: input.reason,
        byUserId: staffUserId,
      },
    });

    if (input.kind === 'DEDUCT_CREDIBILITY' && input.points) {
      await this.credibility.addEvent(input.accountId, 'ADMIN', -Math.abs(input.points), {
        timeWeighted: false,
        note: `Complaint penalty: ${input.reason}`,
        recomputeNow: true,
      });
    } else if (input.kind === 'HOLD_MEMBERSHIP' && holdUntil) {
      // Suspend all logins on the account for the period.
      await this.prisma.user.updateMany({
        where: { id: { in: account.members.map((m) => m.userId) } },
        data: { holdUntil },
      });
    } else if (input.kind === 'BLOCK') {
      await this.blockAccount(input.accountId);
    }

    void this.notifications.notify(input.accountId, 'ADMIN', 'A moderation action was applied to your account', {});
    return { ok: true };
  }

  /**
   * Block an account (spec Blocked Users): record its identifiers to prevent
   * re-registration, and mark every login BLOCKED. Ongoing deals may still complete
   * (enforced at login: blocked users reach only their ongoing deals).
   */
  async blockAccount(accountId: string) {
    const members = await this.prisma.accountMember.findMany({
      where: { accountId },
      include: { user: { select: { id: true, phone: true } } },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: { in: members.map((m) => m.userId) } },
        data: { status: 'BLOCKED' },
      });
      for (const m of members) {
        if (m.user.phone) {
          await tx.blockedIdentity.upsert({
            where: { kind_value: { kind: 'PHONE', value: m.user.phone } },
            create: { kind: 'PHONE', value: m.user.phone, reason: 'blocked account' },
            update: {},
          });
        }
      }
    });
  }
}
