import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType = 'MATCH' | 'DEAL' | 'ADMIN';

/**
 * In-app notifications. `type` + `data` let clients render localized copy;
 * `body` is the plain fallback. Email/SMS channels + per-user preferences
 * arrive in Phase 5; push (FCM/APNs) in v2.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget safe: never lets a notification failure break the main flow. */
  async notify(
    accountId: string,
    type: NotificationType,
    body: string,
    data?: Record<string, unknown>,
    title?: string,
  ) {
    try {
      await this.prisma.notification.create({
        data: { accountId, type, body, data: data as Prisma.InputJsonValue | undefined, title },
      });
    } catch (err) {
      this.logger.warn(`notify(${type}) failed: ${(err as Error).message}`);
    }
  }

  list(accountId: string) {
    return this.prisma.notification.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(accountId: string) {
    const count = await this.prisma.notification.count({
      where: { accountId, readAt: null },
    });
    return { count };
  }

  async markRead(accountId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, accountId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(accountId: string) {
    await this.prisma.notification.updateMany({
      where: { accountId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
