import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Admin dashboard + per-user analytics (spec Analytics). Fixed set in v1. */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async adminOverview() {
    const [
      users,
      accounts,
      activeMissions,
      ongoingDeals,
      completedDeals,
      escrow,
      pendingVerifications,
      openComplaints,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.account.count(),
      this.prisma.mission.count({ where: { status: 'ACTIVE' } }),
      this.prisma.deal.count({
        where: { status: { in: ['ONGOING', 'ARRIVED_DESTINATION', 'READY_FOR_PICKUP'] } },
      }),
      this.prisma.deal.count({ where: { status: 'COMPLETED' } }),
      this.prisma.ledgerEntry.aggregate({
        where: { systemAccount: 'ESCROW', currency: 'USD' },
        _sum: { amountMinor: true },
      }),
      this.prisma.verification.count({ where: { status: { in: ['NEW', 'STUDYING'] } } }),
      this.prisma.complaint.count({ where: { status: { in: ['NEW', 'UNDER_REVIEW'] } } }),
    ]);

    const dealsByStatus = await this.prisma.deal.groupBy({ by: ['status'], _count: true });

    return {
      users,
      accounts,
      activeMissions,
      ongoingDeals,
      completedDeals,
      escrowHeldUsd: escrow._sum.amountMinor ?? 0,
      queues: { pendingVerifications, openComplaints },
      dealsByStatus: Object.fromEntries(dealsByStatus.map((d) => [d.status, d._count])),
    };
  }

  /** The user's own account performance (spec: trips/shipments/deals stats). */
  async forAccount(accountId: string) {
    const [trips, shipments, asTraveler, asShopper, completed] = await Promise.all([
      this.prisma.mission.count({ where: { accountId, kind: 'TRIP' } }),
      this.prisma.mission.count({ where: { accountId, kind: 'SHIPMENT' } }),
      this.prisma.deal.count({ where: { travelerAccountId: accountId } }),
      this.prisma.deal.count({ where: { shopperAccountId: accountId } }),
      this.prisma.deal.count({
        where: {
          status: 'COMPLETED',
          OR: [{ travelerAccountId: accountId }, { shopperAccountId: accountId }],
        },
      }),
    ]);
    return { trips, shipments, dealsAsTraveler: asTraveler, dealsAsShopper: asShopper, completedDeals: completed };
  }
}
