import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { canApproveResolution } from './deal-state';

@Injectable()
export class FlagsService {
  private readonly logger = new Logger(FlagsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Partially (traveler marks; requires a problem type) ───────────────────

  async markPartially(
    dealId: string,
    actingAccountId: string,
    problem: 'LOST_DAMAGED' | 'DELAYED',
  ) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.travelerAccountId !== actingAccountId)
      throw new ForbiddenException('Only the traveler can flag a deal as partially');
    if (['COMPLETED', 'CANCELLED', 'REQUESTED', 'NEGOTIATING'].includes(deal.status))
      throw new BadRequestException('Deal is not in progress');

    await this.prisma.$transaction([
      this.prisma.dealFlag.upsert({
        where: { dealId_type: { dealId, type: 'PARTIALLY' } },
        create: { dealId, type: 'PARTIALLY', problem },
        update: { active: true, clearedAt: null, problem },
      }),
      this.prisma.dealEvent.create({
        data: { dealId, type: 'flag.partially', data: { problem } },
      }),
    ]);
    return { ok: true };
  }

  // ── Customs (trip-level; inherited except traveler-pays-all-customs deals) ─

  async markTripCustoms(tripMissionId: string, actingAccountId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: tripMissionId } });
    if (!mission || mission.kind !== 'TRIP') throw new NotFoundException('Trip not found');
    if (mission.accountId !== actingAccountId) throw new ForbiddenException('Not your trip');

    const deals = await this.prisma.deal.findMany({
      where: {
        tripMissionId,
        status: { in: ['ONGOING', 'ARRIVED_DESTINATION', 'READY_FOR_PICKUP'] },
        travelerPaysAllCustoms: false, // exempt per docs/02 §3
      },
      select: { id: true },
    });

    await this.prisma.$transaction(
      deals.flatMap((d) => [
        this.prisma.dealFlag.upsert({
          where: { dealId_type: { dealId: d.id, type: 'CUSTOMS' } },
          create: { dealId: d.id, type: 'CUSTOMS' },
          update: { active: true, clearedAt: null },
        }),
        this.prisma.dealEvent.create({
          data: { dealId: d.id, type: 'flag.customs', data: { tripMissionId } },
        }),
      ]),
    );
    // Cost-sharing itself is negotiated in chat (decision M3) — the flag only gates completion.
    return { flagged: deals.length };
  }

  // ── Delayed (system flag; cleared at arrival/pickup) ──────────────────────

  /** Hourly sweep (BullMQ takes over when Redis lands in Phase 3). */
  @Cron(CronExpression.EVERY_HOUR)
  async delayedFlagsSweep() {
    try {
      await this.refreshDelayedFlags();
    } catch (err) {
      // e.g. no database in early dev — never let the cron crash the process
      this.logger.warn(`Delayed-flag sweep skipped: ${(err as Error).message}`);
    }
  }

  /** Flags ONGOING deals whose trip passed its delivery date. Called by the scheduler. */
  async refreshDelayedFlags(now = new Date()) {
    const overdue = await this.prisma.deal.findMany({
      where: {
        status: 'ONGOING',
        tripMission: { trip: { deliveryDate: { lt: now } } },
        flags: { none: { type: 'DELAYED', active: true } },
      },
      select: { id: true },
    });
    await this.prisma.$transaction(
      overdue.flatMap((d) => [
        this.prisma.dealFlag.upsert({
          where: { dealId_type: { dealId: d.id, type: 'DELAYED' } },
          create: { dealId: d.id, type: 'DELAYED' },
          update: { active: true, clearedAt: null },
        }),
        this.prisma.dealEvent.create({ data: { dealId: d.id, type: 'flag.delayed', data: {} } }),
      ]),
    );
    if (overdue.length) this.logger.log(`Flagged ${overdue.length} deal(s) as delayed`);
    return { flagged: overdue.length };
  }

  /** Auto-remove DELAYED when the trip reaches destination / pickup (docs/02 §3). */
  async clearDelayedFlags(dealIds: string[]) {
    if (!dealIds.length) return;
    await this.prisma.dealFlag.updateMany({
      where: { dealId: { in: dealIds }, type: 'DELAYED', active: true },
      data: { active: false, clearedAt: new Date() },
    });
  }

  // ── Resolution (the green flag) ────────────────────────────────────────────

  /** Propose or edit. An edit by the other party moves proposership (re-approval needed). */
  async proposeResolution(dealId: string, actingAccountId: string, text: string) {
    const deal = await this.getPartyDeal(dealId, actingAccountId);
    if (['COMPLETED', 'CANCELLED'].includes(deal.status))
      throw new BadRequestException('Deal is closed');

    const resolution = await this.prisma.dealResolution.upsert({
      where: { dealId },
      create: { dealId, text, proposedByAccountId: actingAccountId },
      update: { text, proposedByAccountId: actingAccountId, status: 'PROPOSED' },
    });
    await this.prisma.dealEvent.create({
      data: { dealId, type: 'resolution.proposed', data: { accountId: actingAccountId } },
    });
    return resolution;
  }

  async approveResolution(dealId: string, actingAccountId: string) {
    const deal = await this.getPartyDeal(dealId, actingAccountId);
    const resolution = await this.prisma.dealResolution.findUnique({ where: { dealId } });
    if (!resolution) throw new NotFoundException('No resolution proposed');
    if (!canApproveResolution(resolution, actingAccountId))
      throw new ForbiddenException('The other party must approve the current text');

    const approved = await this.prisma.dealResolution.update({
      where: { dealId },
      data: { status: 'APPROVED' },
    });
    await this.prisma.dealEvent.create({
      data: { dealId: deal.id, type: 'resolution.approved', data: { accountId: actingAccountId } },
    });
    return approved;
  }

  private async getPartyDeal(dealId: string, accountId: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.travelerAccountId !== accountId && deal.shopperAccountId !== accountId)
      throw new ForbiddenException('Not your deal');
    return deal;
  }
}
