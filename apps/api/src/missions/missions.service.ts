import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateShipmentInput,
  CreateTripInput,
  UpdateShipmentInput,
  UpdateTripInput,
} from '@sindbad/shared';
import { PrismaService } from '../prisma/prisma.service';
import { classifyTripEdit, dateOrderError } from './trip-rules';

/** Deal statuses that count as "accepted" for the edit rules. */
const ACCEPTED_DEAL_STATUSES = [
  'ONGOING',
  'ARRIVED_DESTINATION',
  'READY_FOR_PICKUP',
  'COMPLETED',
] as const;

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

  // ── Edits (spec "Users can update their trips" — docs/02 §3) ──────────────

  async updateTrip(accountId: string, missionId: string, input: UpdateTripInput) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { trip: true },
    });
    if (!mission?.trip || mission.kind !== 'TRIP') throw new NotFoundException('Trip not found');
    if (mission.accountId !== accountId) throw new ForbiddenException('Not your trip');
    if (!['PENDING_APPROVAL', 'ACTIVE', 'DRAFT'].includes(mission.status))
      throw new BadRequestException(`A ${mission.status} trip cannot be edited`);

    if (input.allowedCategoryIds) await this.assertCategories(input.allowedCategoryIds);

    const { free, approvalDates, deliveryDate } = classifyTripEdit(input);
    const trip = mission.trip;

    // Merged dates must always respect the blueprint ordering.
    const merged = {
      receivingStart:
        (approvalDates.receivingStart as Date | null | undefined) !== undefined
          ? (approvalDates.receivingStart as Date | null)
          : trip.receivingStart,
      receivingEnd: (approvalDates.receivingEnd as Date | undefined) ?? trip.receivingEnd,
      tripDate: (approvalDates.tripDate as Date | undefined) ?? trip.tripDate,
      deliveryDate: (deliveryDate as Date | undefined) ?? trip.deliveryDate,
    };
    const orderError = dateOrderError(merged);
    if (orderError) throw new BadRequestException(orderError);

    const dateChangesNeedApproval =
      mission.status === 'ACTIVE' && Object.keys(approvalDates).length > 0;

    // Delivery date changes directly only while there are no accepted deals.
    if (deliveryDate !== undefined) {
      const accepted = await this.prisma.deal.count({
        where: { tripMissionId: missionId, status: { in: [...ACCEPTED_DEAL_STATUSES] } },
      });
      if (accepted > 0)
        throw new BadRequestException(
          'Delivery date cannot change while the trip has accepted deals',
        );
    }

    const { allowedCategoryIds, ...freeScalars } = free as Record<string, unknown> & {
      allowedCategoryIds?: string[];
    };

    await this.prisma.$transaction(async (tx) => {
      const directDates = dateChangesNeedApproval ? {} : approvalDates;
      await tx.trip.update({
        where: { missionId },
        data: {
          ...freeScalars,
          ...directDates,
          ...(deliveryDate !== undefined ? { deliveryDate: deliveryDate as Date } : {}),
        },
      });
      if (allowedCategoryIds) {
        await tx.tripCategory.deleteMany({ where: { missionId } });
        await tx.tripCategory.createMany({
          data: allowedCategoryIds.map((categoryId) => ({ missionId, categoryId })),
        });
      }
    });

    // Active-trip date changes go to the Edit Approvals queue (before → after).
    if (dateChangesNeedApproval) {
      const pending = await this.prisma.changeRequest.findFirst({
        where: { subjectType: 'TRIP_DATES', subjectId: missionId, status: 'PENDING' },
      });
      if (pending)
        throw new BadRequestException('A date-change request is already awaiting approval');

      const iso = (d: Date | null) => (d ? d.toISOString() : null);
      const changeRequest = await this.prisma.changeRequest.create({
        data: {
          accountId,
          subjectType: 'TRIP_DATES',
          subjectId: missionId,
          before: {
            receivingStart: iso(trip.receivingStart),
            receivingEnd: iso(trip.receivingEnd),
            tripDate: iso(trip.tripDate),
          },
          after: {
            receivingStart:
              approvalDates.receivingStart !== undefined
                ? iso(approvalDates.receivingStart as Date | null)
                : iso(trip.receivingStart),
            receivingEnd: iso(merged.receivingEnd),
            tripDate: iso(merged.tripDate),
          },
        },
      });
      return { updated: true, pendingApproval: true, changeRequestId: changeRequest.id };
    }

    return { updated: true, pendingApproval: false };
  }

  async updateShipment(accountId: string, missionId: string, input: UpdateShipmentInput) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { shipment: true },
    });
    if (!mission?.shipment || mission.kind !== 'SHIPMENT')
      throw new NotFoundException('Shipment not found');
    if (mission.accountId !== accountId) throw new ForbiddenException('Not your shipment');
    if (!['ACTIVE', 'DRAFT'].includes(mission.status))
      throw new BadRequestException(`A ${mission.status} shipment cannot be edited`);

    // Non-cyclic shipments lock once a deal is accepted; cyclic edit freely (docs/02 §3).
    if (!mission.isCyclic) {
      const accepted = await this.prisma.deal.count({
        where: { shipmentMissionId: missionId, status: { in: [...ACCEPTED_DEAL_STATUSES] } },
      });
      if (accepted > 0)
        throw new BadRequestException('This shipment has an accepted deal and cannot be edited');
    }

    if (input.items) await this.assertCategories(input.items.map((i) => i.categoryId));

    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { missionId },
        data: {
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.feeUsd !== undefined ? { feeUsd: input.feeUsd } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      });
      if (input.items) {
        await tx.item.deleteMany({ where: { shipmentId: missionId } });
        await tx.item.createMany({
          data: input.items.map((i) => ({
            shipmentId: missionId,
            details: i.details,
            url: i.url,
            volumetricWeightKg: i.volumetricWeightKg,
            count: i.count,
            categoryId: i.categoryId,
            declaredValueUsd: i.declaredValueUsd,
            notes: i.notes,
          })),
        });
      }
    });
    return { updated: true };
  }

  // ── Edit Approvals queue (admin) ───────────────────────────────────────────

  listChangeRequests(status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING') {
    return this.prisma.changeRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decideChangeRequest(id: string, staffUserId: string, approve: boolean) {
    const request = await this.prisma.changeRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Change request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Already decided');

    if (approve && request.subjectType === 'TRIP_DATES') {
      const trip = await this.prisma.trip.findUnique({ where: { missionId: request.subjectId } });
      if (!trip) throw new NotFoundException('Trip no longer exists');
      const after = request.after as {
        receivingStart: string | null;
        receivingEnd: string;
        tripDate: string;
      };
      const merged = {
        receivingStart: after.receivingStart ? new Date(after.receivingStart) : null,
        receivingEnd: new Date(after.receivingEnd),
        tripDate: new Date(after.tripDate),
        deliveryDate: trip.deliveryDate,
      };
      const orderError = dateOrderError(merged);
      if (orderError) throw new BadRequestException(`Cannot apply: ${orderError}`);

      await this.prisma.trip.update({
        where: { missionId: request.subjectId },
        data: {
          receivingStart: merged.receivingStart,
          receivingEnd: merged.receivingEnd,
          tripDate: merged.tripDate,
        },
      });
    }

    await this.prisma.changeRequest.update({
      where: { id },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        decidedByUserId: staffUserId,
        decidedAt: new Date(),
      },
    });
    return { ok: true, approved: approve };
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
