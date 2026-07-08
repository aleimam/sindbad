import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { feeForDeal, type FeeItemInput, type FeeParams } from './fee-engine';

export interface EstimateInput {
  originCountryId: string;
  destinationCountryId: string;
  type: 'BOX' | 'BASKET';
  items: Array<{ categoryId: string; volumetricWeightKg: number; count: number }>;
}

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getConfig() {
    return this.prisma.feeConfig.upsert({
      where: { id: 'GLOBAL' },
      create: { id: 'GLOBAL' },
      update: {},
    });
  }

  /** The user-facing Estimated Fee (spec "Fee Estimation") — tap-to-copy on forms. */
  async estimate(input: EstimateInput) {
    const [config, origin, destination, categories] = await Promise.all([
      this.getConfig(),
      this.prisma.country.findUnique({ where: { id: input.originCountryId } }),
      this.prisma.country.findUnique({ where: { id: input.destinationCountryId } }),
      this.prisma.category.findMany({
        where: { id: { in: input.items.map((i) => i.categoryId) } },
      }),
    ]);
    if (!origin || !destination) throw new BadRequestException('Unknown country');
    const multipliers = new Map(categories.map((c) => [c.id, c.typeMultiplier]));

    const params: FeeParams = {
      basketMultiplier: config.basketMultiplier,
      weightUsdPerKgMinor: config.weightUsdPerKg,
      floorFeeMinor: config.floorFeeUsd,
      countryMultiplier: origin.priceParam * destination.priceParam,
    };
    const items: FeeItemInput[] = input.items.map((i) => {
      const t = multipliers.get(i.categoryId);
      if (t === undefined) throw new BadRequestException('Unknown category');
      return { typeMultiplier: t, volumetricWeightKg: i.volumetricWeightKg, count: i.count };
    });

    const fee = feeForDeal(input.type, params, items);
    return {
      currency: 'USD' as const,
      floorFeeMinor: fee.floorFeeMinor,
      itemFeesMinor: fee.itemFeesMinor,
      totalMinor: fee.totalMinor,
    };
  }
}
