import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SocialService } from '../trust/social.service';
import { evaluateMatch, shipmentTotalWeight, type TripForMatch } from './matching';

/**
 * Walking-skeleton matching: computed on read with indexed candidate queries.
 * Phase 2 adds the stored Match table, the periodic sweep, notifications, and
 * per-category Accept/Reject/Ask stances (today: allowed = ACCEPT, absent = REJECT).
 */
@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly social: SocialService,
  ) {}

  // ── Stored matches: sync on mission events + periodic sweep (docs/02 §5) ──

  /** Recompute the stored Match rows for one mission; notify both parties of new pairs once. */
  async syncMatchesForMission(missionId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) return { created: 0 };

    const side = mission.kind === 'TRIP' ? 'tripMissionId' : 'shipmentMissionId';
    if (mission.status !== 'ACTIVE') {
      await this.prisma.match.updateMany({
        where: { [side]: missionId, active: true },
        data: { active: false },
      });
      return { created: 0 };
    }

    const entries =
      mission.kind === 'TRIP'
        ? await this.shipmentsForTrip(missionId)
        : await this.tripsForShipment(missionId);

    const pairs = entries.map((e) => ({
      tripMissionId: mission.kind === 'TRIP' ? missionId : e.mission.id,
      shipmentMissionId: mission.kind === 'TRIP' ? e.mission.id : missionId,
      askFlagged: e.askFlagged,
      otherAccountId: e.mission.account.id,
    }));

    // Deactivate pairs that stopped matching.
    await this.prisma.match.updateMany({
      where: {
        [side]: missionId,
        active: true,
        NOT: pairs.map((p) => ({
          tripMissionId: p.tripMissionId,
          shipmentMissionId: p.shipmentMissionId,
        })),
      },
      data: { active: false },
    });

    let created = 0;
    for (const pair of pairs) {
      const match = await this.prisma.match.upsert({
        where: {
          tripMissionId_shipmentMissionId: {
            tripMissionId: pair.tripMissionId,
            shipmentMissionId: pair.shipmentMissionId,
          },
        },
        create: {
          tripMissionId: pair.tripMissionId,
          shipmentMissionId: pair.shipmentMissionId,
          askFlagged: pair.askFlagged,
        },
        update: { active: true, askFlagged: pair.askFlagged },
      });

      // Notify both owners exactly once per pair (spec: notify on new matching missions).
      if (!match.notifiedAt) {
        created += 1;
        const data = {
          tripMissionId: pair.tripMissionId,
          shipmentMissionId: pair.shipmentMissionId,
        };
        await this.notifications.notify(
          mission.accountId,
          'MATCH',
          mission.kind === 'TRIP'
            ? 'A new shipment matches your trip'
            : 'A new trip matches your shipment',
          data,
        );
        await this.notifications.notify(
          pair.otherAccountId,
          'MATCH',
          mission.kind === 'TRIP'
            ? 'A new trip matches your shipment'
            : 'A new shipment matches your trip',
          data,
        );
        await this.prisma.match.update({
          where: { id: match.id },
          data: { notifiedAt: new Date() },
        });
      }
    }
    return { created };
  }

  /** Hourly reconciliation sweep over active trips (covers window expiry etc.). */
  @Cron(CronExpression.EVERY_HOUR)
  async matchesSweep() {
    try {
      const trips = await this.prisma.mission.findMany({
        where: { kind: 'TRIP', status: 'ACTIVE' },
        select: { id: true },
        take: 500,
      });
      for (const trip of trips) await this.syncMatchesForMission(trip.id);
      if (trips.length) this.logger.log(`Match sweep over ${trips.length} trip(s) done`);
    } catch (err) {
      this.logger.warn(`Match sweep skipped: ${(err as Error).message}`);
    }
  }

  async shipmentsForTrip(tripMissionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: tripMissionId },
      include: { trip: { include: { allowedCategories: true } } },
    });
    if (!mission?.trip) return [];
    const tripForMatch = this.toTripForMatch(mission);

    const blocked = await this.social.blockedAccountIds(mission.accountId);
    const candidates = await this.prisma.mission.findMany({
      where: {
        kind: 'SHIPMENT',
        status: 'ACTIVE',
        originCountryId: mission.originCountryId,
        destinationCountryId: mission.destinationCountryId,
        accountId: { not: mission.accountId, notIn: blocked }, // never match yourself or blocked pairs
      },
      include: {
        shipment: { include: { items: true } },
        account: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return candidates
      .map((c) => {
        const result = evaluateMatch(tripForMatch, {
          originCountryId: c.originCountryId,
          destinationCountryId: c.destinationCountryId,
          itemCategoryIds: c.shipment!.items.map((i) => i.categoryId),
          totalWeightKg: shipmentTotalWeight(c.shipment!.items),
        });
        return result.match ? { mission: c, askFlagged: result.askFlagged } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  async tripsForShipment(shipmentMissionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: shipmentMissionId },
      include: { shipment: { include: { items: true } } },
    });
    if (!mission?.shipment) return [];
    const shipmentForMatch = {
      originCountryId: mission.originCountryId,
      destinationCountryId: mission.destinationCountryId,
      itemCategoryIds: mission.shipment.items.map((i) => i.categoryId),
      totalWeightKg: shipmentTotalWeight(mission.shipment.items),
    };

    const blocked = await this.social.blockedAccountIds(mission.accountId);
    const candidates = await this.prisma.mission.findMany({
      where: {
        kind: 'TRIP',
        status: 'ACTIVE',
        originCountryId: mission.originCountryId,
        destinationCountryId: mission.destinationCountryId,
        accountId: { not: mission.accountId, notIn: blocked },
      },
      include: {
        trip: { include: { allowedCategories: true } },
        account: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return candidates
      .map((c) => {
        const result = evaluateMatch(this.toTripForMatch(c), shipmentForMatch);
        return result.match ? { mission: c, askFlagged: result.askFlagged } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  /** Direct pair check — used when a deal is requested. */
  async pairMatches(tripMissionId: string, shipmentMissionId: string) {
    const [tripMission, shipmentMission] = await Promise.all([
      this.prisma.mission.findUnique({
        where: { id: tripMissionId },
        include: { trip: { include: { allowedCategories: true } } },
      }),
      this.prisma.mission.findUnique({
        where: { id: shipmentMissionId },
        include: { shipment: { include: { items: true } } },
      }),
    ]);
    if (!tripMission?.trip || !shipmentMission?.shipment) return { match: false as const };
    return evaluateMatch(this.toTripForMatch(tripMission), {
      originCountryId: shipmentMission.originCountryId,
      destinationCountryId: shipmentMission.destinationCountryId,
      itemCategoryIds: shipmentMission.shipment.items.map((i) => i.categoryId),
      totalWeightKg: shipmentTotalWeight(shipmentMission.shipment.items),
    });
  }

  private toTripForMatch(mission: {
    originCountryId: string;
    destinationCountryId: string;
    trip: {
      receivingEnd: Date;
      availableWeightKg: number;
      allowedCategories: Array<{ categoryId: string; stance: 'ACCEPT' | 'REJECT' | 'ASK' }>;
    } | null;
  }): TripForMatch {
    return {
      originCountryId: mission.originCountryId,
      destinationCountryId: mission.destinationCountryId,
      receivingEnd: mission.trip!.receivingEnd,
      availableWeightKg: mission.trip!.availableWeightKg,
      // ACCEPT/ASK rows stored per trip; absent = REJECT (evaluateMatch handles Ask-flagging).
      categoryStances: new Map(mission.trip!.allowedCategories.map((c) => [c.categoryId, c.stance])),
    };
  }
}
