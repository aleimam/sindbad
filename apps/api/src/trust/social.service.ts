import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UserFlagKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Outstanding / Follow / Block flags + transfer Favorites (docs/02 §8). */
@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async setFlag(ownerAccountId: string, targetAccountId: string, kind: UserFlagKind) {
    if (ownerAccountId === targetAccountId) throw new BadRequestException('Cannot flag yourself');
    const target = await this.prisma.account.findUnique({ where: { id: targetAccountId } });
    if (!target) throw new NotFoundException('Account not found');
    return this.prisma.userFlag.upsert({
      where: { ownerAccountId_targetAccountId: { ownerAccountId, targetAccountId } },
      create: { ownerAccountId, targetAccountId, kind },
      update: { kind },
    });
  }

  async clearFlag(ownerAccountId: string, targetAccountId: string) {
    await this.prisma.userFlag.deleteMany({ where: { ownerAccountId, targetAccountId } });
    return { ok: true };
  }

  myFlags(ownerAccountId: string) {
    return this.prisma.userFlag.findMany({ where: { ownerAccountId } });
  }

  /** Accounts blocked in either direction — excluded from matching, deals, chat. */
  async blockedAccountIds(accountId: string): Promise<string[]> {
    const flags = await this.prisma.userFlag.findMany({
      where: {
        kind: 'BLOCK',
        OR: [{ ownerAccountId: accountId }, { targetAccountId: accountId }],
      },
    });
    return flags.map((f) =>
      f.ownerAccountId === accountId ? f.targetAccountId : f.ownerAccountId,
    );
  }

  async isBlockedPair(a: string, b: string): Promise<boolean> {
    const flag = await this.prisma.userFlag.findFirst({
      where: {
        kind: 'BLOCK',
        OR: [
          { ownerAccountId: a, targetAccountId: b },
          { ownerAccountId: b, targetAccountId: a },
        ],
      },
    });
    return Boolean(flag);
  }

  // ── Favorites (transfer recipients) ──

  async addFavorite(ownerAccountId: string, targetAccountId: string) {
    if (ownerAccountId === targetAccountId) throw new BadRequestException('Cannot favorite yourself');
    const target = await this.prisma.account.findUnique({ where: { id: targetAccountId } });
    if (!target) throw new NotFoundException('Account not found');
    return this.prisma.favorite.upsert({
      where: { ownerAccountId_targetAccountId: { ownerAccountId, targetAccountId } },
      create: { ownerAccountId, targetAccountId },
      update: {},
    });
  }

  async removeFavorite(ownerAccountId: string, targetAccountId: string) {
    await this.prisma.favorite.deleteMany({ where: { ownerAccountId, targetAccountId } });
    return { ok: true };
  }

  async favorites(ownerAccountId: string) {
    const favorites = await this.prisma.favorite.findMany({ where: { ownerAccountId } });
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: favorites.map((f) => f.targetAccountId) } },
      select: { id: true, displayName: true, credibilityScore: true, credibilityTier: true },
    });
    return accounts;
  }

  /** The public "user details page" (spec UX): profile + active missions handled by caller. */
  async publicProfile(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        displayName: true,
        type: true,
        credibilityScore: true,
        credibilityTier: true,
        createdAt: true,
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    const activeMissions = await this.prisma.mission.findMany({
      where: { accountId, status: 'ACTIVE' },
      include: {
        origin: { select: { id: true, nameEn: true, nameAr: true } },
        destination: { select: { id: true, nameEn: true, nameAr: true } },
        shipment: { select: { type: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { ...account, activeMissions };
  }
}
