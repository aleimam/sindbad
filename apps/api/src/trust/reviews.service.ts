import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../money/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CredibilityService } from './credibility.service';
import { DEFAULT_STAR_POINTS, starPoints, windowState, type StarPointsMap } from './reviews';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly credibility: CredibilityService,
  ) {}

  /** Both parties may review inside the window; blind until reveal. */
  async submit(dealId: string, authorAccountId: string, stars: number, comment?: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.travelerAccountId !== authorAccountId && deal.shopperAccountId !== authorAccountId)
      throw new ForbiddenException('Not your deal');
    if (deal.status !== 'COMPLETED' || !deal.completedAt)
      throw new BadRequestException('Reviews open after completion');

    const state = windowState(deal.completedAt, new Date());
    if (state === 'LOCKED') throw new BadRequestException('Reviews open 12 hours after completion');
    if (state === 'CLOSED') throw new BadRequestException('The review window has closed');

    const targetAccountId =
      deal.travelerAccountId === authorAccountId ? deal.shopperAccountId : deal.travelerAccountId;

    const existing = await this.prisma.review.findUnique({
      where: { dealId_authorAccountId: { dealId, authorAccountId } },
    });
    if (existing) throw new BadRequestException('You already reviewed this deal (no edits)');

    const review = await this.prisma.review.create({
      data: { dealId, authorAccountId, targetAccountId, stars, comment },
    });

    // Reveal when both sides have submitted (decision P1).
    const other = await this.prisma.review.findUnique({
      where: { dealId_authorAccountId: { dealId, authorAccountId: targetAccountId } },
    });
    if (other) await this.reveal([review.id, other.id]);

    return review;
  }

  /** Reveal reviews + apply their credibility effect (once, at reveal). */
  private async reveal(reviewIds: string[]) {
    const map = await this.settings.get<StarPointsMap>('credibility.starPoints', DEFAULT_STAR_POINTS);
    const reviews = await this.prisma.review.findMany({
      where: { id: { in: reviewIds }, status: 'PENDING' },
    });
    for (const review of reviews) {
      await this.prisma.review.update({
        where: { id: review.id },
        data: { status: 'REVEALED' },
      });
      await this.credibility.addEvent(
        review.targetAccountId,
        'REVIEW',
        starPoints(review.stars, map),
        { refId: review.id },
      );
      void this.notifications.notify(review.targetAccountId, 'DEAL', 'You received a review', {
        dealId: review.dealId,
      });
    }
  }

  /** Hourly: lone reviews reveal once the window closes (decision #7). */
  @Cron(CronExpression.EVERY_HOUR)
  async revealSweep() {
    try {
      const cutoff = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000);
      const pending = await this.prisma.review.findMany({
        where: { status: 'PENDING' },
        take: 500,
      });
      const dealIds = [...new Set(pending.map((r) => r.dealId))];
      const deals = await this.prisma.deal.findMany({
        where: { id: { in: dealIds }, completedAt: { lt: cutoff } },
        select: { id: true },
      });
      const closedDealIds = new Set(deals.map((d) => d.id));
      const toReveal = pending.filter((r) => closedDealIds.has(r.dealId)).map((r) => r.id);
      if (toReveal.length) {
        await this.reveal(toReveal);
        this.logger.log(`Revealed ${toReveal.length} review(s) at window close`);
      }
    } catch (err) {
      this.logger.warn(`Review reveal sweep skipped: ${(err as Error).message}`);
    }
  }

  /** Party view: own review always; the other's only after reveal. */
  async forDeal(dealId: string, viewerAccountId: string) {
    const reviews = await this.prisma.review.findMany({ where: { dealId } });
    return reviews.filter(
      (r) => r.authorAccountId === viewerAccountId || r.status === 'REVEALED',
    );
  }

  /** Public profile reviews (revealed only). */
  forAccount(targetAccountId: string) {
    return this.prisma.review.findMany({
      where: { targetAccountId, status: 'REVEALED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Delete allowed, edit not (decision P2). Removes its credibility effect. */
  async remove(reviewId: string, authorAccountId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.authorAccountId !== authorAccountId) throw new ForbiddenException('Not your review');

    await this.prisma.$transaction([
      this.prisma.review.delete({ where: { id: reviewId } }),
      this.prisma.credibilityEvent.deleteMany({ where: { refId: reviewId, kind: 'REVIEW' } }),
    ]);
    await this.credibility.recomputeAccount(review.targetAccountId);
    return { ok: true };
  }

  /** The reviewed party may respond once, after reveal (decision P2). */
  async respond(reviewId: string, targetAccountId: string, text: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.targetAccountId !== targetAccountId)
      throw new ForbiddenException('Only the reviewed party can respond');
    if (review.status !== 'REVEALED') throw new BadRequestException('Review not revealed yet');
    if (review.response) throw new BadRequestException('Already responded');

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { response: text, respondedAt: new Date() },
    });
  }
}
