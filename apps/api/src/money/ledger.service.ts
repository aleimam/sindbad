import { BadRequestException, Injectable } from '@nestjs/common';
import type { LedgerTxType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { validateEntries, walletDeltas, type EntryDraft } from './ledger';

/**
 * The only writer of money movements. Every post is one atomic transaction:
 * entries created, wallet balances updated, negatives rejected — all or nothing.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureWallet(accountId: string): Promise<string> {
    const wallet = await this.prisma.wallet.upsert({
      where: { accountId },
      create: { accountId },
      update: {},
    });
    return wallet.id;
  }

  /**
   * Post a balanced transaction. `allowNegative` stays false for user wallets —
   * a debit that would overdraw any wallet aborts the whole transaction.
   */
  async post(params: {
    type: LedgerTxType;
    entries: EntryDraft[];
    dealId?: string;
    actorUserId?: string;
    note?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const error = validateEntries(params.entries);
    if (error) throw new BadRequestException(`Ledger: ${error}`);

    const run = async (tx: Prisma.TransactionClient) => {
      // Apply balance deltas first (atomic upserts), rejecting overdrafts.
      for (const delta of walletDeltas(params.entries)) {
        const balance = await tx.walletBalance.upsert({
          where: {
            walletId_currency: { walletId: delta.walletId, currency: delta.currency },
          },
          create: {
            walletId: delta.walletId,
            currency: delta.currency,
            balanceMinor: delta.deltaMinor,
          },
          update: { balanceMinor: { increment: delta.deltaMinor } },
        });
        if (balance.balanceMinor < 0)
          throw new BadRequestException('Insufficient balance');
      }
      return tx.ledgerTransaction.create({
        data: {
          type: params.type,
          dealId: params.dealId,
          actorUserId: params.actorUserId,
          note: params.note,
          entries: {
            create: params.entries.map((e) => ({
              walletId: e.walletId,
              systemAccount: e.systemAccount,
              currency: e.currency,
              amountMinor: e.amountMinor,
            })),
          },
        },
        include: { entries: true },
      });
    };

    // Join the caller's transaction when given (e.g. deal acceptance), else open one.
    return params.tx ? run(params.tx) : this.prisma.$transaction(run);
  }

  async getBalances(accountId: string) {
    const walletId = await this.ensureWallet(accountId);
    const balances = await this.prisma.walletBalance.findMany({ where: { walletId } });
    const byCurrency = { USD: 0, EGP: 0 } as Record<'USD' | 'EGP', number>;
    for (const b of balances) byCurrency[b.currency] = b.balanceMinor;
    return { walletId, balances: byCurrency };
  }

  async getStatement(accountId: string, take = 50) {
    const walletId = await this.ensureWallet(accountId);
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { walletId },
      include: { transaction: { select: { type: true, dealId: true, note: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return entries.map((e) => ({
      id: e.id,
      type: e.transaction.type,
      dealId: e.transaction.dealId,
      note: e.transaction.note,
      currency: e.currency,
      amountMinor: e.amountMinor,
      createdAt: e.createdAt,
    }));
  }
}
