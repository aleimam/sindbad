import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateMatch, shipmentTotalWeight, type TripForMatch } from './matching';

/**
 * Walking-skeleton matching: computed on read with indexed candidate queries.
 * Phase 2 adds the stored Match table, the periodic sweep, notifications, and
 * per-category Accept/Reject/Ask stances (today: allowed = ACCEPT, absent = REJECT).
 */
@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async shipmentsForTrip(tripMissionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: tripMissionId },
      include: { trip: { include: { allowedCategories: true } } },
    });
    if (!mission?.trip) return [];
    const tripForMatch = this.toTripForMatch(mission);

    const candidates = await this.prisma.mission.findMany({
      where: {
        kind: 'SHIPMENT',
        status: 'ACTIVE',
        originCountryId: mission.originCountryId,
        destinationCountryId: mission.destinationCountryId,
        accountId: { not: mission.accountId }, // never match your own missions
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

    const candidates = await this.prisma.mission.findMany({
      where: {
        kind: 'TRIP',
        status: 'ACTIVE',
        originCountryId: mission.originCountryId,
        destinationCountryId: mission.destinationCountryId,
        accountId: { not: mission.accountId },
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
      allowedCategories: Array<{ categoryId: string }>;
    } | null;
  }): TripForMatch {
    return {
      originCountryId: mission.originCountryId,
      destinationCountryId: mission.destinationCountryId,
      receivingEnd: mission.trip!.receivingEnd,
      availableWeightKg: mission.trip!.availableWeightKg,
      categoryStances: new Map(
        mission.trip!.allowedCategories.map((c) => [c.categoryId, 'ACCEPT' as const]),
      ),
    };
  }
}
