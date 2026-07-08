import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LIMITS, type MoneyLimits } from './limits';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return row ? (row.value as T) : fallback;
  }

  async set(key: string, value: unknown) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });
  }

  getMoneyLimits(): Promise<MoneyLimits> {
    return this.get<MoneyLimits>('money.limits', DEFAULT_LIMITS);
  }

  getFxSpreadPct(): Promise<number> {
    return this.get<number>('fx.spreadPct', 0); // 0 at launch (docs/02 §4)
  }
}
