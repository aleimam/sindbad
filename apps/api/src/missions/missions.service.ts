import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateShipmentInput, CreateTripInput } from '@sindbad/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Public field selection — NEVER exposes tripDate or receivingAddress (privacy rules). */
const PUBLIC_TRIP_SELECT = {
  receivingStart: true,
  receivingEnd: true,
  deliveryDate: true,
  deliveryLocation: true,
  travelerCount: true,
  availableWeightKg: true,
  feeUsd: true,
  notes: true,
  allowedCategories: { select: { category: { select: { id: true, nameEn: true, nameAr: true } } } },
} as const;

const MISSION_INCLUDE_PUBLIC = {
  origin: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  destination: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  account: { select: { id: true, displayName: true, type: true } },
} as const;

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Trips ──────────────────────────────────────────────────────────────────

  /** Trips need admin approval (flight docs + passport uploads land with the media module). */
  async createTrip(accountId: string, input: CreateTripInput) {
    await this.assertCountries(input.originCountryId, input.destinationCountryId);
    await this.assertCyclicAllowed(accountId, input.isCyclic);
    await this.assertCategories(input.allowedCategoryIds);

    return this.prisma.mission.create({
      data: {
        accountId,
        kind: 'TRIP',
        status: 'PENDING_APPROVAL',
        isCyclic: input.isCyclic,
        originCountryId: input.originCountryId,
        destinationCountryId: input.destinationCountryId,
        trip: {
          create: {
            receivingStart: input.receivingStart,
            receivingEnd: input.receivingEnd,
            tripDate: input.tripDate,
            deliveryDate: input.deliveryDate,
            deliveryLocation: input.deliveryLocation,
            receivingAddress: input.receivingAddress,
            travelerCount: input.travelerCount,
            availableWeightKg: input.availableWeightKg,
            feeUsd: input.feeUsd,
            notes: input.notes,
            allowedCategories: {
              create: input.allowedCategoryIds.map((categoryId) => ({ categoryId })),
            },
          },
        },
      },
      include: { trip: { include: { allowedCategories: true } } },
    });
  }

  /** Shipments go live immediately (no approval — docs/02 §3). */
  async createShipment(accountId: string, input: CreateShipmentInput) {
    await this.assertCountries(input.originCountryId, input.destinationCountryId);
    await this.assertCyclicAllowed(accountId, input.isCyclic);
    await this.assertCategories(input.items.map((i) => i.categoryId));

    return this.prisma.mission.create({
      data: {
        accountId,
        kind: 'SHIPMENT',
        status: 'ACTIVE',
        isCyclic: input.isCyclic,
        originCountryId: input.originCountryId,
        destinationCountryId: input.destinationCountryId,
        shipment: {
          create: {
            type: input.type,
            feeUsd: input.feeUsd,
            notes: input.notes,
            items: {
              create: input.items.map((i) => ({
                details: i.details,
                url: i.url,
                volumetricWeightKg: i.volumetricWeightKg,
                count: i.count,
                categoryId: i.categoryId,
                declaredValueUsd: i.declaredValueUsd,
                notes: i.notes,
              })),
            },
          },
        },
      },
      include: { shipment: { include: { items: true } } },
    });
  }

  // ── Browse (public: private fields excluded) ───────────────────────────────

  browseTrips() {
    return this.prisma.mission.findMany({
      where: { kind: 'TRIP', status: 'ACTIVE' },
      include: { ...MISSION_INCLUDE_PUBLIC, trip: { select: PUBLIC_TRIP_SELECT } },
      orderBy: { createdAt: 'desc' }, // credibility-first ordering lands with the trust module
      take: 50,
    });
  }

  browseShipments() {
    return this.prisma.mission.findMany({
      where: { kind: 'SHIPMENT', status: 'ACTIVE' },
      include: { ...MISSION_INCLUDE_PUBLIC, shipment: { include: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  mine(accountId: string) {
    return this.prisma.mission.findMany({
      where: { accountId },
      include: {
        ...MISSION_INCLUDE_PUBLIC,
        trip: { include: { allowedCategories: true } },
        shipment: { include: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Detail. Owners see everything; everyone else gets the public projection. */
  async byId(missionId: string, viewerAccountId?: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        ...MISSION_INCLUDE_PUBLIC,
        trip: { include: { allowedCategories: { include: { category: true } } } },
        shipment: { include: { items: { include: { category: true } } } },
      },
    });
    if (!mission) throw new NotFoundException('Mission not found');

    const isOwner = viewerAccountId === mission.accountId;
    if (!isOwner && mission.trip) {
      // Strip the private fields for non-owners.
      const { tripDate: _t, receivingAddress: _a, ...publicTrip } = mission.trip;
      return { ...mission, trip: publicTrip, isOwner };
    }
    return { ...mission, isOwner };
  }

  // ── Admin approval ─────────────────────────────────────────────────────────

  pendingTrips() {
    return this.prisma.mission.findMany({
      where: { kind: 'TRIP', status: 'PENDING_APPROVAL' },
      include: { ...MISSION_INCLUDE_PUBLIC, trip: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveTrip(missionId: string) {
    await this.assertPendingTrip(missionId);
    return this.prisma.mission.update({ where: { id: missionId }, data: { status: 'ACTIVE' } });
  }

  async rejectTrip(missionId: string) {
    await this.assertPendingTrip(missionId);
    return this.prisma.mission.update({ where: { id: missionId }, data: { status: 'REJECTED' } });
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private async assertPendingTrip(missionId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission || mission.kind !== 'TRIP') throw new NotFoundException('Trip not found');
    if (mission.status !== 'PENDING_APPROVAL')
      throw new BadRequestException(`Trip is ${mission.status}, not pending approval`);
  }

  private async assertCountries(...ids: string[]) {
    const count = await this.prisma.country.count({
      where: { id: { in: ids }, active: true },
    });
    if (count !== new Set(ids).size) throw new BadRequestException('Unknown country');
  }

  private async assertCategories(ids: string[]) {
    const unique = [...new Set(ids)];
    const count = await this.prisma.category.count({
      where: { id: { in: unique }, active: true },
    });
    if (count !== unique.length) throw new BadRequestException('Unknown category');
  }

  /** Cyclic missions are commercial-only (docs/02 §4). */
  private async assertCyclicAllowed(accountId: string, isCyclic: boolean) {
    if (!isCyclic) return;
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (account?.type !== 'COMMERCIAL')
      throw new ForbiddenException('Cyclic missions require a commercial account');
  }
}
