import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocialService } from '../trust/social.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MediaService } from '../media/media.service';
import { canEditMessage, orderedPair, receiptOf } from './chat.rules';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
    private readonly notifications: NotificationsService,
    private readonly media: MediaService,
    private readonly gateway: ChatGateway,
  ) {}

  /**
   * Eligibility (docs/02 §9): a shared deal (any status) OR an active match
   * between their missions — and never blocked.
   */
  async canChat(a: string, b: string): Promise<boolean> {
    if (a === b) return false;
    if (await this.social.isBlockedPair(a, b)) return false;

    const deal = await this.prisma.deal.findFirst({
      where: {
        OR: [
          { travelerAccountId: a, shopperAccountId: b },
          { travelerAccountId: b, shopperAccountId: a },
        ],
      },
      select: { id: true },
    });
    if (deal) return true;

    const match = await this.prisma.match.findFirst({
      where: {
        active: true,
        OR: [
          { tripMission: { accountId: a }, shipmentMission: { accountId: b } },
          { tripMission: { accountId: b }, shipmentMission: { accountId: a } },
        ],
      },
      select: { id: true },
    });
    return Boolean(match);
  }

  /** Open (or return) the thread with another account. */
  async openThread(actingAccountId: string, otherAccountId: string) {
    if (!(await this.canChat(actingAccountId, otherAccountId)))
      throw new ForbiddenException(
        'You can chat only with users you have deals or active matches with',
      );
    const pair = orderedPair(actingAccountId, otherAccountId);
    return this.prisma.chatThread.upsert({
      where: { accountAId_accountBId: pair },
      create: pair,
      update: {},
    });
  }

  /** Thread list with the counterpart, last message, and unread count. */
  async myThreads(accountId: string) {
    const threads = await this.prisma.chatThread.findMany({
      where: { OR: [{ accountAId: accountId }, { accountBId: accountId }] },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const otherIds = threads.map((t) => (t.accountAId === accountId ? t.accountBId : t.accountAId));
    const [others, unreads] = await Promise.all([
      this.prisma.account.findMany({
        where: { id: { in: otherIds } },
        select: { id: true, displayName: true, credibilityScore: true, credibilityTier: true },
      }),
      this.prisma.chatMessage.groupBy({
        by: ['threadId'],
        where: {
          threadId: { in: threads.map((t) => t.id) },
          senderAccountId: { not: accountId },
          readAt: null,
          unsentAt: null,
        },
        _count: true,
      }),
    ]);
    const unreadByThread = new Map(unreads.map((u) => [u.threadId, u._count]));
    return threads.map((t) => {
      const otherId = t.accountAId === accountId ? t.accountBId : t.accountAId;
      return {
        id: t.id,
        lastMessageAt: t.lastMessageAt,
        other: others.find((o) => o.id === otherId) ?? { id: otherId, displayName: '?' },
        lastMessage: t.messages[0] ? this.serializeMessage(t.messages[0]) : null,
        unread: unreadByThread.get(t.id) ?? 0,
      };
    });
  }

  async messages(threadId: string, accountId: string, before?: string) {
    const thread = await this.getMyThread(threadId, accountId);
    const messages = await this.prisma.chatMessage.findMany({
      where: { threadId: thread.id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { replyTo: { select: { id: true, body: true, senderAccountId: true, unsentAt: true } } },
    });
    // Fetching implies delivery for incoming messages (✓✓ gray).
    await this.markDelivered(thread.id, accountId);
    const photos = await this.media.listForSubjects('CHAT', messages.map((m) => m.id));
    return messages.reverse().map((m) => ({
      ...this.serializeMessage(m),
      photos: photos.filter((p) => p.subjectId === m.id).map((p) => p.id),
    }));
  }

  async send(threadId: string, senderAccountId: string, body?: string, replyToId?: string) {
    const thread = await this.getMyThread(threadId, senderAccountId);
    const otherId =
      thread.accountAId === senderAccountId ? thread.accountBId : thread.accountAId;
    if (await this.social.isBlockedPair(senderAccountId, otherId))
      throw new ForbiddenException('This conversation is blocked');
    if (!body?.trim() && !replyToId) {
      // photo-only messages are allowed — but require at least intent
      if (body !== undefined) throw new BadRequestException('Empty message');
    }
    if (replyToId) {
      const target = await this.prisma.chatMessage.findUnique({ where: { id: replyToId } });
      if (!target || target.threadId !== thread.id)
        throw new BadRequestException('Reply target not in this thread');
    }

    const recipientOnline = this.gateway.isOnline(otherId);
    const message = await this.prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        senderAccountId,
        body: body?.trim() || null,
        replyToId,
        deliveredAt: recipientOnline ? new Date() : null,
      },
      include: { replyTo: { select: { id: true, body: true, senderAccountId: true, unsentAt: true } } },
    });
    await this.prisma.chatThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: message.createdAt },
    });

    const payload = { threadId: thread.id, message: this.serializeMessage(message) };
    this.gateway.emitToAccount(otherId, 'message.new', payload);
    this.gateway.emitToAccount(senderAccountId, 'message.new', payload);
    if (!recipientOnline) {
      void this.notifications.notify(otherId, 'DEAL', 'New message', { threadId: thread.id });
    }
    return payload.message;
  }

  async edit(messageId: string, accountId: string, body: string) {
    const message = await this.getMyMessage(messageId, accountId);
    if (message.unsentAt) throw new BadRequestException('Message was unsent');
    if (!canEditMessage(message.createdAt, new Date()))
      throw new BadRequestException('Messages can be edited within 15 minutes');

    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { body: body.trim(), editedAt: new Date() },
    });
    this.pushUpdate(updated.threadId, updated);
    return this.serializeMessage(updated);
  }

  async unsend(messageId: string, accountId: string) {
    const message = await this.getMyMessage(messageId, accountId);
    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { body: null, unsentAt: new Date() },
    });
    this.pushUpdate(updated.threadId, updated);
    return this.serializeMessage(updated);
  }

  /** Mark all incoming messages read (✓✓ blue) and push the receipt. */
  async markRead(threadId: string, accountId: string) {
    const thread = await this.getMyThread(threadId, accountId);
    await this.prisma.chatMessage.updateMany({
      where: { threadId: thread.id, senderAccountId: { not: accountId }, readAt: null },
      data: { readAt: new Date(), deliveredAt: new Date() },
    });
    const otherId = thread.accountAId === accountId ? thread.accountBId : thread.accountAId;
    this.gateway.emitToAccount(otherId, 'thread.read', { threadId: thread.id });
    return { ok: true };
  }

  private async markDelivered(threadId: string, accountId: string) {
    const result = await this.prisma.chatMessage.updateMany({
      where: { threadId, senderAccountId: { not: accountId }, deliveredAt: null, unsentAt: null },
      data: { deliveredAt: new Date() },
    });
    if (result.count > 0) {
      const thread = await this.prisma.chatThread.findUnique({ where: { id: threadId } });
      if (thread) {
        const otherId = thread.accountAId === accountId ? thread.accountBId : thread.accountAId;
        this.gateway.emitToAccount(otherId, 'thread.delivered', { threadId });
      }
    }
  }

  async unreadCount(accountId: string) {
    const threads = await this.prisma.chatThread.findMany({
      where: { OR: [{ accountAId: accountId }, { accountBId: accountId }] },
      select: { id: true },
    });
    const count = await this.prisma.chatMessage.count({
      where: {
        threadId: { in: threads.map((t) => t.id) },
        senderAccountId: { not: accountId },
        readAt: null,
        unsentAt: null,
      },
    });
    return { count };
  }

  // ── Admin monitor (spec: staff review all chats) ──

  adminThreads() {
    return this.prisma.chatThread.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });
  }

  adminMessages(threadId: string) {
    return this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
  }

  // ── Internals ──

  private async getMyThread(threadId: string, accountId: string) {
    const thread = await this.prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.accountAId !== accountId && thread.accountBId !== accountId)
      throw new ForbiddenException('Not your conversation');
    return thread;
  }

  private async getMyMessage(messageId: string, accountId: string) {
    const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderAccountId !== accountId) throw new ForbiddenException('Not your message');
    return message;
  }

  private pushUpdate(threadId: string, message: { id: string } & Record<string, unknown>) {
    void this.prisma.chatThread
      .findUnique({ where: { id: threadId } })
      .then((thread) => {
        if (!thread) return;
        const payload = { threadId, message: this.serializeMessage(message as never) };
        this.gateway.emitToAccount(thread.accountAId, 'message.updated', payload);
        this.gateway.emitToAccount(thread.accountBId, 'message.updated', payload);
      })
      .catch(() => undefined);
  }

  private serializeMessage(m: {
    id: string;
    threadId?: string;
    senderAccountId: string;
    body: string | null;
    replyToId?: string | null;
    replyTo?: unknown;
    editedAt: Date | null;
    unsentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: m.id,
      senderAccountId: m.senderAccountId,
      body: m.unsentAt ? null : m.body,
      replyTo: m.replyTo ?? null,
      editedAt: m.editedAt,
      unsent: Boolean(m.unsentAt),
      receipt: receiptOf(m),
      createdAt: m.createdAt,
    };
  }
}
