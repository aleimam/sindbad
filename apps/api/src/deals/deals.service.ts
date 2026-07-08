import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RequestDealInput } from '@sindbad/shared';
import type { Deal, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LedgerService } from '../money/ledger.service';
import { escrowAmountMinor } from '../money/fee-engine';
import { shipmentTotalWeight } from '../matching/matching';
import {
  canAccept,
  canChangeFee,
  canComplete,
  canMarkArrived,
  canMarkReady,
  cancellation,
  completionBlocked,
  nextStep,
  stepsComplete,
  type DealKind,
  type Party,
} from './deal-state';
import { FlagsService } from './flags.service';

const DEAL_INCLUDE = {
  tripMission: {
    include: {
      trip: true,
      origin: { select: { id: true, code: true, nameEn: true, nameAr: true } },
      destination: { select: { id: true, code: true, nameEn: true, nameAr: true } },
    },
  },
  shipmentMission: { include: { shipment: { include: { items: true } } } },
  travelerAccount: { select: { id: true, displayName: true } },
  shopperAccount: { select: { id: true, displayName: true } },
  flags: { where: { active: true } },
  resolution: true,
} satisfies Prisma.DealInclude;

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly flags: FlagsService,
    private readonly notifications: NotificationsService,
    private readonly ledger: LedgerService,
  ) {}

  /** Notify the counterpart of an acting party (fire-and-forget). */
  private notifyOther(
    deal: { travelerAccountId: string; shopperAccountId: string; id: string },
    actingAccountId: string,
    body: string,
  ) {
    const other =
      deal.travelerAccountId === actingAccountId ? deal.shopperAccountId : deal.travelerAccountId;
    void this.notifications.notify(other, 'DEAL', body, { dealId: deal.id });
  }

  // ── Request & negotiation ─────────────────────────────────────────────────

  async request(actingAccountId: string, input: RequestDealInput) {
    const [tripMission, shipmentMission] = await Promise.all([
      this.prisma.mission.findUnique({
        where: { id: input.tripMissionId },
        include: { trip: true },
      }),
      this.prisma.mission.findUnique({
        where: { id: input.shipmentMissionId },
        include: { shipment: { include: { items: true } } },
      }),
    ]);
    if (!tripMission?.trip || tripMission.kind !== 'TRIP')
      throw new NotFoundException('Trip not found');
    if (!shipmentMission?.shipment || shipmentMission.kind !== 'SHIPMENT')
      throw new NotFoundException('Shipment not found');
    if (tripMission.status !== 'ACTIVE' || shipmentMission.status !== 'ACTIVE')
      throw new BadRequestException('Both missions must be active');

    const travelerAccountId = tripMission.accountId;
    const shopperAccountId = shipmentMission.accountId;
    if (travelerAccountId === shopperAccountId)
      throw new BadRequestException('Cannot deal with yourself');
    if (actingAccountId !== travelerAccountId && actingAccountId !== shopperAccountId)
      throw new ForbiddenException('You must own the trip or the shipment');

    const match = await this.matching.pairMatches(input.tripMissionId, input.shipmentMissionId);
    if (!match.match) throw new BadRequestException('Trip and shipment do not match');

    const feeUsd =
      input.feeUsd ?? shipmentMission.shipment.feeUsd ?? tripMission.trip.feeUsd ?? 0;

    const deal = await this.prisma.deal.create({
      data: {
        tripMissionId: tripMission.id,
        shipmentMissionId: shipmentMission.id,
        travelerAccountId,
        shopperAccountId,
        requestedByAccountId: actingAccountId,
        lastOfferByAccountId: actingAccountId,
        paymentMethod: input.paymentMethod,
        feeUsd,
        events: {
          create: {
            type: 'requested',
            data: { accountId: actingAccountId, feeUsd, askFlagged: match.askFlagged },
          },
        },
      },
      include: DEAL_INCLUDE,
    });
    this.notifyOther(deal, actingAccountId, 'You have a new deal request');
    return this.serialize(deal, actingAccountId);
  }

  async changeFee(dealId: string, actingAccountId: string, feeUsd: number) {
    const deal = await this.getPartyDeal(dealId, actingAccountId);
    if (!canChangeFee(deal.status)) throw new BadRequestException('Negotiation is closed');

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        status: 'NEGOTIATING',
        feeUsd,
        lastOfferByAccountId: actingAccountId,
        events: { create: { type: 'fee.changed', data: { accountId: actingAccountId, feeUsd } } },
      },
      include: DEAL_INCLUDE,
    });
    this.notifyOther(updated, actingAccountId, 'New fee offer on your deal');
    return this.serialize(updated, actingAccountId);
  }

  /**
   * Acceptance by the party who did NOT make the last offer → the deal is agreed.
   * Money hook (Phase 3): IN_APP deals escrow here. Weight depletes for one-time trips.
   */
  async accept(dealId: string, actingAccountId: string) {
    const deal = await this.getPartyDeal(dealId, actingAccountId);
    if (!canAccept(deal.status)) throw new BadRequestException('Deal is not open for acceptance');
    if (deal.lastOfferByAccountId === actingAccountId)
      throw new ForbiddenException('The other party must accept the current offer');

    const tripMission = await this.prisma.mission.findUnique({
      where: { id: deal.tripMissionId },
      include: { trip: true, shipmentMission: false } as never,
    });
    const shipment = await this.prisma.shipment.findUnique({
      where: { missionId: deal.shipmentMissionId },
      include: { items: true },
    });
    const weight = shipmentTotalWeight(shipment?.items ?? []);

    // In-app deals escrow on acceptance (docs/02 §4): Box = fee; Basket = fee + price.
    const escrowMinor =
      deal.paymentMethod === 'IN_APP'
        ? escrowAmountMinor(shipment?.type ?? 'BOX', deal.feeUsd, shipment?.items ?? [])
        : 0;
    const shopperWalletId =
      escrowMinor > 0 ? await this.ledger.ensureWallet(deal.shopperAccountId) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Deplete available weight for one-time trips (cyclic trips keep full capacity).
      if (tripMission && !tripMission.isCyclic) {
        const trip = await tx.trip.findUnique({ where: { missionId: deal.tripMissionId } });
        if (!trip) throw new NotFoundException('Trip not found');
        if (trip.availableWeightKg < weight)
          throw new BadRequestException('Trip no longer has enough available weight');
        await tx.trip.update({
          where: { missionId: deal.tripMissionId },
          data: { availableWeightKg: { decrement: weight } },
        });
      }
      // Fund escrow atomically with the acceptance (aborts on insufficient balance).
      if (escrowMinor > 0 && shopperWalletId) {
        await this.ledger.post({
          type: 'ESCROW_FUND',
          dealId,
          entries: [
            { walletId: shopperWalletId, currency: 'USD', amountMinor: -escrowMinor },
            { systemAccount: 'ESCROW', currency: 'USD', amountMinor: escrowMinor },
          ],
          tx,
        });
      }
      return tx.deal.update({
        where: { id: dealId },
        data: {
          status: 'ONGOING',
          ongoingStep: null,
          escrowedUsd: escrowMinor,
          events: {
            create: [
              { type: 'accepted', data: { accountId: actingAccountId, feeUsd: deal.feeUsd } },
              ...(escrowMinor > 0
                ? [{ type: 'escrow.funded', data: { amountMinor: escrowMinor } }]
                : []),
            ],
          },
        },
        include: DEAL_INCLUDE,
      });
    });
    this.notifyOther(updated, actingAccountId, 'Your deal was accepted');
    return this.serialize(updated, actingAccountId);
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  async advance(dealId: string, actingAccountId: string) {
    const deal = await this.getPartyDeal(dealId, actingAccountId);
    if (deal.status !== 'ONGOING') throw new BadRequestException('Deal is not in progress');

    const kind = this.dealKind(deal);
    const next = nextStep(kind, deal.ongoingStep);
    if (!next) throw new BadRequestException('All steps are already complete');

    const party = this.partyOf(deal, actingAccountId);
    if (party !== next.actor)
      throw new ForbiddenException(`Only the ${next.actor.toLowerCase()} can mark ${next.step}`);

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        ongoingStep: next.step,
        events: { create: { type: 'step.advanced', data: { step: next.step, by: party } } },
      },
      include: DEAL_INCLUDE,
    });
    this.notifyOther(updated, actingAccountId, `Deal update: ${next.step.replaceAll('_', ' ').toLowerCase()}`);
    return this.serialize(updated, actingAccountId);
  }

  /** Traveler marks the whole trip arrived → deals with completed steps advance. */
  async tripArrived(tripMissionId: string, actingAccountId: string) {
    await this.assertTripOwner(tripMissionId, actingAccountId);
    const deals = await this.prisma.deal.findMany({
      where: { tripMissionId, status: 'ONGOING' },
      include: { shipmentMission: { include: { shipment: true } } },
    });
    const ready = deals.filter(
      (d) =>
        canMarkArrived(d.status) &&
        stepsComplete(this.dealKind(d), d.ongoingStep),
    );
    await this.prisma.$transaction(
      ready.map((d) =>
        this.prisma.deal.update({
          where: { id: d.id },
          data: {
            status: 'ARRIVED_DESTINATION',
            events: { create: { type: 'trip.arrived', data: {} } },
          },
        }),
      ),
    );
    // Delayed flags auto-clear when the trip reaches the destination (docs/02 §3).
    await this.flags.clearDelayedFlags(ready.map((d) => d.id));
    // Deals whose steps are not complete stay behind ("missed behind" flow lands Phase 2).
    return { arrived: ready.length, leftBehind: deals.length - ready.length };
  }

  /** Bulk Ready-for-Pickup — excludes flagged/missed deals per the approved rule. */
  async tripReady(tripMissionId: string, actingAccountId: string) {
    await this.assertTripOwner(tripMissionId, actingAccountId);
    const deals = await this.prisma.deal.findMany({
      where: { tripMissionId, status: 'ARRIVED_DESTINATION' },
    });
    const eligible = deals.filter((d) => canMarkReady(d.status));
    await this.prisma.$transaction(
      eligible.map((d) =>
        this.prisma.deal.update({
          where: { id: d.id },
          data: {
            status: 'READY_FOR_PICKUP',
            events: { create: { type: 'ready.pickup', data: {} } },
          },
        }),
      ),
    );
    await this.flags.clearDelayedFlags(eligible.map((d) => d.id));
    // Spec: notify every shopper on the trip to pick up their deals.
    for (const d of eligible)
      void this.notifications.notify(d.shopperAccountId, 'DEAL', 'Your deal is ready for pickup', {
        dealId: d.id,
      });
    return { readyForPickup: eligible.length };
  }

  /** Shopper confirms receipt — Phase 3 releases escrow here. */
  async complete(dealId: string, actingAccountId: string) {
    const deal = await this.getPartyDeal(dealId, actingAccountId);
    if (this.partyOf(deal, actingAccountId) !== 'SHOPPER')
      throw new ForbiddenException('Only the shopper can complete the deal');
    if (!canComplete(deal.status)) throw new BadRequestException('Deal is not ready for pickup');

    // The green-flag rule: flagged deals need an approved resolution first (docs/02 §3).
    const [activeFlags, resolution] = await Promise.all([
      this.prisma.dealFlag.findMany({ where: { dealId, active: true } }),
      this.prisma.dealResolution.findUnique({ where: { dealId } }),
    ]);
    if (completionBlocked(activeFlags, resolution))
      throw new BadRequestException(
        'This deal is flagged — both parties must approve a resolution before completing',
      );

    // Escrow releases to the traveler on completion (commission = 0 at launch).
    const travelerWalletId =
      deal.escrowedUsd > 0 ? await this.ledger.ensureWallet(deal.travelerAccountId) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (deal.escrowedUsd > 0 && travelerWalletId) {
        await this.ledger.post({
          type: 'ESCROW_RELEASE',
          dealId,
          entries: [
            { systemAccount: 'ESCROW', currency: 'USD', amountMinor: -deal.escrowedUsd },
            { walletId: travelerWalletId, currency: 'USD', amountMinor: deal.escrowedUsd },
          ],
          tx,
        });
      }
      return tx.deal.update({
        where: { id: dealId },
        data: {
          status: 'COMPLETED',
          escrowedUsd: 0,
          events: {
            create: [
              { type: 'completed', data: { accountId: actingAccountId } },
              ...(deal.escrowedUsd > 0
                ? [{ type: 'escrow.released', data: { amountMinor: deal.escrowedUsd } }]
                : []),
            ],
          },
        },
        include: DEAL_INCLUDE,
      });
    });
    this.notifyOther(updated, actingAccountId, 'Your deal was completed 🎉');
    return this.serialize(updated, actingAccountId);
  }

  /**
   * Cancellation. Freely while unaccepted; the shopper may cancel later, but at
   * Ordered-or-later it becomes a staff-approved request (docs/02 §3).
   */
  async cancel(dealId: string, actingAccountId: string, reason?: string) {
    const deal = await this.getPartyDeal(dealId, actingAccountId);
    const party = this.partyOf(deal, actingAccountId);
    const rule = cancellation(deal.status, deal.ongoingStep, party);
    if (!rule.allowed) throw new ForbiddenException('You cannot cancel this deal');

    if (rule.needsStaffApproval) {
      if (!reason?.trim())
        throw new BadRequestException('A cancellation reason is required at this stage');
      const existing = await this.prisma.cancellationRequest.findUnique({ where: { dealId } });
      if (existing?.status === 'PENDING')
        throw new BadRequestException('A cancellation request is already pending');

      await this.prisma.$transaction([
        this.prisma.cancellationRequest.upsert({
          where: { dealId },
          create: { dealId, requestedByAccountId: actingAccountId, reason },
          update: {
            requestedByAccountId: actingAccountId,
            reason,
            status: 'PENDING',
            decidedByUserId: null,
            decidedAt: null,
          },
        }),
        this.prisma.dealEvent.create({
          data: {
            dealId,
            type: 'cancel.requested',
            data: { accountId: actingAccountId, reason },
          },
        }),
      ]);
      this.notifyOther(deal, actingAccountId, 'A cancellation was requested on your deal');
      return { pendingStaffApproval: true as const };
    }

    const updated = await this.executeCancellation(dealId, {
      byAccountId: actingAccountId,
      reason,
    });
    this.notifyOther(updated, actingAccountId, 'Your deal was cancelled');
    return this.serialize(updated, actingAccountId);
  }

  // ── Staff cancellation queue ──────────────────────────────────────────────

  listPendingCancellations() {
    return this.prisma.cancellationRequest.findMany({
      where: { status: 'PENDING' },
      include: { deal: { include: DEAL_INCLUDE } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decideCancellation(requestId: string, staffUserId: string, approve: boolean) {
    const request = await this.prisma.cancellationRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Cancellation request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Already decided');

    await this.prisma.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        decidedByUserId: staffUserId,
        decidedAt: new Date(),
      },
    });

    if (approve) {
      const cancelled = await this.executeCancellation(request.dealId, {
        byAccountId: request.requestedByAccountId,
        reason: request.reason,
        staffUserId,
      });
      void this.notifications.notify(cancelled.travelerAccountId, 'DEAL', 'Deal cancelled (approved by staff)', { dealId: cancelled.id });
      void this.notifications.notify(cancelled.shopperAccountId, 'DEAL', 'Deal cancelled (approved by staff)', { dealId: cancelled.id });
    } else {
      await this.prisma.dealEvent.create({
        data: {
          dealId: request.dealId,
          type: 'cancel.rejected',
          data: { staffUserId },
        },
      });
      void this.notifications.notify(request.requestedByAccountId, 'DEAL', 'Your cancellation request was declined', { dealId: request.dealId });
    }
    return { ok: true, approved: approve };
  }

  /** The actual cancellation: restore weight, mark CANCELLED, refund stub (Phase 3). */
  private async executeCancellation(
    dealId: string,
    meta: { byAccountId: string; reason?: string; staffUserId?: string },
  ) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');

    // Any escrowed funds return to the shopper on cancellation (docs/02 §3).
    const shopperWalletId =
      deal.escrowedUsd > 0 ? await this.ledger.ensureWallet(deal.shopperAccountId) : null;

    return this.prisma.$transaction(async (tx) => {
      // Restore depleted weight if the deal had been accepted on a one-time trip.
      if (deal.status !== 'REQUESTED' && deal.status !== 'NEGOTIATING') {
        const mission = await tx.mission.findUnique({ where: { id: deal.tripMissionId } });
        if (mission && !mission.isCyclic) {
          const shipment = await tx.shipment.findUnique({
            where: { missionId: deal.shipmentMissionId },
            include: { items: true },
          });
          await tx.trip.update({
            where: { missionId: deal.tripMissionId },
            data: { availableWeightKg: { increment: shipmentTotalWeight(shipment?.items ?? []) } },
          });
        }
      }
      if (deal.escrowedUsd > 0 && shopperWalletId) {
        await this.ledger.post({
          type: 'ESCROW_REFUND',
          dealId,
          entries: [
            { systemAccount: 'ESCROW', currency: 'USD', amountMinor: -deal.escrowedUsd },
            { walletId: shopperWalletId, currency: 'USD', amountMinor: deal.escrowedUsd },
          ],
          tx,
        });
      }
      return tx.deal.update({
        where: { id: dealId },
        data: {
          status: 'CANCELLED',
          cancelReason: meta.reason,
          escrowedUsd: 0,
          events: {
            create: [
              {
                type: 'cancelled',
                data: {
                  accountId: meta.byAccountId,
                  reason: meta.reason ?? null,
                  staffUserId: meta.staffUserId ?? null,
                },
              },
              ...(deal.escrowedUsd > 0
                ? [{ type: 'escrow.refunded', data: { amountMinor: deal.escrowedUsd } }]
                : []),
            ],
          },
        },
        include: DEAL_INCLUDE,
      });
    });
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async mine(accountId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { OR: [{ travelerAccountId: accountId }, { shopperAccountId: accountId }] },
      include: DEAL_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return deals.map((d) => this.serialize(d, accountId));
  }

  async byId(dealId: string, accountId: string) {
    const deal = await this.getPartyDeal(dealId, accountId, true);
    return this.serialize(deal, accountId);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async getPartyDeal(dealId: string, accountId: string, withEvents = false) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: withEvents
        ? { ...DEAL_INCLUDE, events: { orderBy: { createdAt: 'asc' as const } } }
        : DEAL_INCLUDE,
    });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.travelerAccountId !== accountId && deal.shopperAccountId !== accountId)
      throw new ForbiddenException('Not your deal');
    return deal;
  }

  private partyOf(deal: Deal, accountId: string): Party {
    return deal.travelerAccountId === accountId ? 'TRAVELER' : 'SHOPPER';
  }

  private dealKind(deal: {
    shipmentMission?: { shipment?: { type: 'BOX' | 'BASKET' } | null } | null;
  }): DealKind {
    return deal.shipmentMission?.shipment?.type ?? 'BOX';
  }

  private async assertTripOwner(tripMissionId: string, accountId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: tripMissionId } });
    if (!mission || mission.kind !== 'TRIP') throw new NotFoundException('Trip not found');
    if (mission.accountId !== accountId) throw new ForbiddenException('Not your trip');
  }

  /**
   * Privacy rule (docs/03): the trip's full receiving address is revealed to the
   * shopper only once the deal is dual-agreed; the private tripDate never leaves.
   */
  private serialize(
    deal: Deal & { tripMission?: { trip?: Record<string, unknown> | null } | null },
    viewerAccountId: string,
  ) {
    const agreed = !['REQUESTED', 'NEGOTIATING', 'CANCELLED'].includes(deal.status);
    const isTraveler = deal.travelerAccountId === viewerAccountId;
    const trip = deal.tripMission?.trip;
    if (trip) {
      const { tripDate: _priv, receivingAddress, ...rest } = trip;
      deal.tripMission!.trip =
        isTraveler || agreed ? { ...rest, receivingAddress } : rest;
    }
    return deal;
  }
}
