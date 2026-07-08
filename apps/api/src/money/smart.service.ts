import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { feeForDeal, type FeeParams } from './fee-engine';
import { applyRatio, calibrationRatio, type SmartSample } from './smart';

const MIN_SAMPLES = 10;
const WINDOW_DAYS = 90;

/**
 * SMART fee recalibration (docs/02 §4): a monthly job back-fits the global fee
 * parameters from executed deals and proposes them for admin approval.
 */
@Injectable()
export class SmartService {
  private readonly logger = new Logger(SmartService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 05:00 UTC on the 1st of every month. */
  @Cron('0 5 1 * *')
  async monthlyRecalibration() {
    try {
      const result = await this.buildProposal();
      this.logger.log(`SMART: ${result.created ? `proposal ${result.id}` : result.reason}`);
    } catch (err) {
      this.logger.warn(`SMART skipped: ${(err as Error).message}`);
    }
  }

  async buildProposal() {
    const config = await this.prisma.feeConfig.upsert({
      where: { id: 'GLOBAL' },
      create: { id: 'GLOBAL' },
      update: {},
    });

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const deals = await this.prisma.deal.findMany({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: since },
        // FIXED baskets bundle the product price into the fee — not comparable.
        NOT: { pricingMode: 'FIXED' },
      },
      include: {
        shipmentMission: {
          include: {
            shipment: { include: { items: { include: { category: true } } } },
            origin: true,
            destination: true,
          },
        },
      },
      take: 2000,
    });

    const samples: SmartSample[] = deals
      .map((deal) => {
        const shipment = deal.shipmentMission.shipment;
        if (!shipment) return null;
        const params: FeeParams = {
          basketMultiplier: config.basketMultiplier,
          weightUsdPerKgMinor: config.weightUsdPerKg,
          floorFeeMinor: config.floorFeeUsd,
          countryMultiplier:
            deal.shipmentMission.origin.priceParam * deal.shipmentMission.destination.priceParam,
        };
        const predicted = feeForDeal(
          shipment.type,
          params,
          shipment.items.map((i) => ({
            typeMultiplier: i.category.typeMultiplier,
            volumetricWeightKg: i.volumetricWeightKg,
            count: i.count,
          })),
        );
        return { agreedMinor: deal.feeUsd, predictedMinor: predicted.totalMinor };
      })
      .filter((s): s is SmartSample => s !== null);

    if (samples.length < MIN_SAMPLES)
      return { created: false as const, reason: `only ${samples.length} samples (< ${MIN_SAMPLES})` };

    const ratio = calibrationRatio(samples);
    if (ratio === null) return { created: false as const, reason: 'no valid samples' };

    const proposed = applyRatio(config, ratio);
    const proposal = await this.prisma.feeConfigProposal.create({
      data: { sampleSize: samples.length, ratio, proposed },
    });
    return { created: true as const, id: proposal.id };
  }

  listProposals() {
    return this.prisma.feeConfigProposal.findMany({ orderBy: { createdAt: 'desc' }, take: 24 });
  }

  /** Admin approval applies the proposal to the live fee configuration. */
  async decide(id: string, staffUserId: string, approve: boolean) {
    const proposal = await this.prisma.feeConfigProposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.status !== 'PENDING') throw new BadRequestException('Already decided');

    if (approve) {
      const next = proposal.proposed as {
        basketMultiplier: number;
        weightUsdPerKg: number;
        floorFeeUsd: number;
      };
      await this.prisma.feeConfig.update({ where: { id: 'GLOBAL' }, data: next });
    }
    return this.prisma.feeConfigProposal.update({
      where: { id },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        decidedByUserId: staffUserId,
        decidedAt: new Date(),
      },
    });
  }
}
