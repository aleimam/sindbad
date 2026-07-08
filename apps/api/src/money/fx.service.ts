import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

function today(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Latest stored rate; fetches today's on demand when missing. */
  async latestUsdToEgp(): Promise<number> {
    const latest = await this.prisma.fxRate.findFirst({ orderBy: { day: 'desc' } });
    if (latest) return latest.usdToEgp;
    const fetched = await this.fetchAndStore();
    if (!fetched) throw new BadRequestException('FX rate unavailable — try again later');
    return fetched;
  }

  /** Daily rate fetch from a free, keyless API (docs decision O2). */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async dailyFetch() {
    try {
      await this.fetchAndStore();
    } catch (err) {
      this.logger.warn(`FX fetch skipped: ${(err as Error).message}`);
    }
  }

  async fetchAndStore(): Promise<number | null> {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
      const rate = data.rates?.EGP;
      if (data.result !== 'success' || !rate || rate <= 0) return null;
      await this.prisma.fxRate.upsert({
        where: { day: today() },
        create: { day: today(), usdToEgp: rate, source: 'open.er-api.com' },
        update: { usdToEgp: rate, source: 'open.er-api.com' },
      });
      this.logger.log(`FX rate stored: 1 USD = ${rate} EGP`);
      return rate;
    } catch (err) {
      this.logger.warn(`FX fetch failed: ${(err as Error).message}`);
      return null;
    }
  }

  /** Admin manual override for the day (also used before the API is reachable). */
  async setManualRate(usdToEgp: number) {
    if (usdToEgp <= 0) throw new BadRequestException('Rate must be positive');
    return this.prisma.fxRate.upsert({
      where: { day: today() },
      create: { day: today(), usdToEgp, source: 'manual' },
      update: { usdToEgp, source: 'manual' },
    });
  }
}
