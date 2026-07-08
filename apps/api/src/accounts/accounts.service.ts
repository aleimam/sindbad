import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The account a user acts as. Skeleton: their first membership (owner of their personal account). */
  async getActingAccountId(userId: string): Promise<string> {
    const membership = await this.prisma.accountMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { accountId: true },
    });
    if (!membership) throw new ForbiddenException('No account for this user');
    return membership.accountId;
  }

  /** Every account the user can act for (owner or manager). */
  async getAccountIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.accountMember.findMany({
      where: { userId },
      select: { accountId: true },
    });
    return memberships.map((m) => m.accountId);
  }
}
