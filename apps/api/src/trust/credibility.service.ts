import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../money/settings.service';
import {
  computeScore,
  DEFAULT_TIERS,
  DEFAULT_WEIGHTS,
  tierFor,
  type CredibilityWeights,
  type TierThresholds,
} from './credibility';

export interface DealPoints {
  tripPoints: number;
  shipmentPoints: number;
}

export const DEFAULT_DEAL_POINTS: DealPoints = { tripPoints: 4, shipmentPoints: 3 };

@Injectable()
export class CredibilityService {
  private readonly logger = new Logger(CredibilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /** Append an event; the score itself updates on the weekly recompute (decision G4). */
  async addEvent(
    accountId: string,
    kind: 'VERIFICATION' | 'TRIP' | 'SHIPMENT' | 'REVIEW' | 'ADMIN',
    points: number,
    opts: { timeWeighted?: boolean; refId?: string; note?: string; recomputeNow?: boolean } = {},
  ) {
    await this.prisma.credibilityEvent.create({
      data: {
        accountId,
        kind,
        points,
        timeWeighted: opts.timeWeighted ?? true,
        refId: opts.refId,
        note: opts.note,
      },
    });
    if (opts.recomputeNow) await this.recomputeAccount(accountId);
  }

  /** Deal completed → traveler earns trip points, shopper earns shipment points. */
  async onDealCompleted(dealId: string, travelerAccountId: string, shopperAccountId: string) {
    const points = await this.settings.get<DealPoints>('credibility.dealPoints', DEFAULT_DEAL_POINTS);
    await this.addEvent(travelerAccountId, 'TRIP', points.tripPoints, { refId: dealId });
    await this.addEvent(shopperAccountId, 'SHIPMENT', points.shipmentPoints, { refId: dealId });
  }

  async recomputeAccount(accountId: string) {
    const [weights, tiers, events] = await Promise.all([
      this.settings.get<CredibilityWeights>('credibility.weights', DEFAULT_WEIGHTS),
      this.settings.get<TierThresholds>('credibility.tiers', DEFAULT_TIERS),
      this.prisma.credibilityEvent.findMany({
        where: { accountId },
        select: { points: true, timeWeighted: true, createdAt: true },
      }),
    ]);
    const result = computeScore(events, new Date(), weights);
    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        credibilityScore: result.displayScore,
        credibilityTier: tierFor(result.displayScore, tiers),
        flaggedForBlock: result.flaggedForBlock,
      },
    });
    return result;
  }

  /** Weekly recompute — Sunday 03:00 UTC (decision G4: every week; applies time decay). */
  @Cron('0 3 * * 0')
  async weeklyRecompute() {
    try {
      const accounts = await this.prisma.credibilityEvent.groupBy({ by: ['accountId'] });
      for (const a of accounts) await this.recomputeAccount(a.accountId);
      if (accounts.length) this.logger.log(`Credibility recomputed for ${accounts.length} account(s)`);
    } catch (err) {
      this.logger.warn(`Credibility recompute skipped: ${(err as Error).message}`);
    }
  }

  /** The user-facing factor breakdown (Account → Credibility screen). */
  async breakdown(accountId: string) {
    const events = await this.prisma.credibilityEvent.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { credibilityScore: true, credibilityTier: true },
    });
    const byKind: Record<string, number> = {};
    for (const e of events) byKind[e.kind] = (byKind[e.kind] ?? 0) + e.points;
    return { ...account, byKind, events };
  }
}
