import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { normalizeIdentifier } from '@sindbad/shared';
import type { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OtpService } from '../auth/otp.service';
import { LedgerService } from './ledger.service';
import { SettingsService } from './settings.service';
import { limitError } from './limits';

@Injectable()
export class WalletOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly settings: SettingsService,
    private readonly otp: OtpService,
    private readonly notifications: NotificationsService,
  ) {}

  private async assertLimits(currency: Currency, amountMinor: number) {
    const limits = await this.settings.getMoneyLimits();
    const error = limitError(limits, currency, amountMinor);
    if (error) throw new BadRequestException(error);
  }

  // ── Deposits (Instapay / bank — manual, docs/02 §3) ────────────────────────

  async createDeposit(
    accountId: string,
    input: { currency: Currency; amountMinor: number; method: 'INSTAPAY' | 'BANK_TRANSFER' },
  ) {
    await this.assertLimits(input.currency, input.amountMinor);
    const referenceCode = `SB-${randomInt(100000, 999999)}-${Date.now().toString(36).toUpperCase()}`;
    const deposit = await this.prisma.depositRequest.create({
      data: { accountId, ...input, referenceCode },
    });
    return {
      ...deposit,
      // Real company transfer details are configured per environment.
      transferInstructions: await this.settings.get('deposits.instructions', {
        note: 'Put the reference code in the transfer memo.',
      }),
    };
  }

  async submitDepositReference(accountId: string, depositId: string, userReference: string) {
    const deposit = await this.prisma.depositRequest.findUnique({ where: { id: depositId } });
    if (!deposit || deposit.accountId !== accountId)
      throw new NotFoundException('Deposit not found');
    if (deposit.status !== 'REQUESTED') throw new BadRequestException('Already submitted');
    return this.prisma.depositRequest.update({
      where: { id: depositId },
      data: { userReference, status: 'PENDING_REVIEW' },
    });
  }

  myDeposits(accountId: string) {
    return this.prisma.depositRequest.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  pendingDeposits() {
    return this.prisma.depositRequest.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Staff match the bank statement to the reference, then confirm → wallet credited. */
  async decideDeposit(depositId: string, staffUserId: string, approve: boolean) {
    const deposit = await this.prisma.depositRequest.findUnique({ where: { id: depositId } });
    if (!deposit) throw new NotFoundException('Deposit not found');
    if (deposit.status !== 'PENDING_REVIEW') throw new BadRequestException('Not awaiting review');

    if (approve) {
      const walletId = await this.ledger.ensureWallet(deposit.accountId);
      await this.ledger.post({
        type: 'DEPOSIT',
        actorUserId: staffUserId,
        note: `Deposit ${deposit.referenceCode} (${deposit.method})`,
        entries: [
          { systemAccount: 'COMPANY_BANK', currency: deposit.currency, amountMinor: -deposit.amountMinor },
          { walletId, currency: deposit.currency, amountMinor: deposit.amountMinor },
        ],
      });
    }
    const updated = await this.prisma.depositRequest.update({
      where: { id: depositId },
      data: {
        status: approve ? 'CONFIRMED' : 'REJECTED',
        decidedByUserId: staffUserId,
        decidedAt: new Date(),
      },
    });
    void this.notifications.notify(
      deposit.accountId,
      'DEAL',
      approve ? 'Your deposit was confirmed' : 'Your deposit was rejected',
      { depositId },
    );
    return updated;
  }

  // ── Bank accounts & withdrawals (manual, funds held — docs/02 §3) ──────────

  addBankAccount(accountId: string, input: Record<string, string | undefined>) {
    return this.prisma.bankAccount.create({
      data: {
        accountId,
        holderName: input.holderName!,
        country: input.country!,
        bankName: input.bankName!,
        accountNumber: input.accountNumber!,
        iban: input.iban,
        routingNumber: input.routingNumber,
        swift: input.swift,
        holderAddress: input.holderAddress,
      },
    });
  }

  myBankAccounts(accountId: string) {
    return this.prisma.bankAccount.findMany({ where: { accountId } });
  }

  async requestWithdrawal(
    accountId: string,
    input: { bankAccountId: string; currency: Currency; amountMinor: number },
  ) {
    await this.assertLimits(input.currency, input.amountMinor);
    const bank = await this.prisma.bankAccount.findUnique({
      where: { id: input.bankAccountId },
    });
    if (!bank || bank.accountId !== accountId)
      throw new ForbiddenException('Not your bank account');

    const walletId = await this.ledger.ensureWallet(accountId);
    // Hold immediately so the funds cannot be double-spent (decision 2026-06-25).
    return this.prisma.$transaction(async (tx) => {
      await this.ledger.post({
        type: 'WITHDRAWAL_HOLD',
        entries: [
          { walletId, currency: input.currency, amountMinor: -input.amountMinor },
          { systemAccount: 'WITHDRAWALS_PAYABLE', currency: input.currency, amountMinor: input.amountMinor },
        ],
        tx,
      });
      return tx.withdrawalRequest.create({ data: { accountId, ...input } });
    });
  }

  myWithdrawals(accountId: string) {
    return this.prisma.withdrawalRequest.findMany({
      where: { accountId },
      include: { bankAccount: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  pendingWithdrawals() {
    return this.prisma.withdrawalRequest.findMany({
      where: { status: 'PENDING' },
      include: { bankAccount: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Staff executed the bank transfer → debit the hold; rejection releases it. */
  async decideWithdrawal(withdrawalId: string, staffUserId: string, paid: boolean) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') throw new BadRequestException('Already decided');

    const walletId = await this.ledger.ensureWallet(withdrawal.accountId);
    await this.ledger.post({
      type: paid ? 'WITHDRAWAL_EXECUTE' : 'WITHDRAWAL_RELEASE',
      actorUserId: staffUserId,
      entries: paid
        ? [
            { systemAccount: 'WITHDRAWALS_PAYABLE', currency: withdrawal.currency, amountMinor: -withdrawal.amountMinor },
            { systemAccount: 'COMPANY_BANK', currency: withdrawal.currency, amountMinor: withdrawal.amountMinor },
          ]
        : [
            { systemAccount: 'WITHDRAWALS_PAYABLE', currency: withdrawal.currency, amountMinor: -withdrawal.amountMinor },
            { walletId, currency: withdrawal.currency, amountMinor: withdrawal.amountMinor },
          ],
    });
    const updated = await this.prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: paid ? 'PAID' : 'REJECTED',
        decidedByUserId: staffUserId,
        decidedAt: new Date(),
      },
    });
    void this.notifications.notify(
      withdrawal.accountId,
      'DEAL',
      paid ? 'Your withdrawal was paid' : 'Your withdrawal was rejected (funds returned)',
      { withdrawalId },
    );
    return updated;
  }

  // ── P2P transfers (OTP-verified — spec O7) ─────────────────────────────────

  async initiateTransfer(
    userId: string,
    fromAccountId: string,
    input: { recipient: string; currency: Currency; amountMinor: number },
  ) {
    await this.assertLimits(input.currency, input.amountMinor);
    const toAccountId = await this.resolveRecipient(input.recipient);
    if (toAccountId === fromAccountId) throw new BadRequestException('Cannot send to yourself');

    // Ensure the balance covers it up front (final check happens at post time).
    const balances = await this.ledger.getBalances(fromAccountId);
    if (balances.balances[input.currency] < input.amountMinor)
      throw new BadRequestException('Insufficient balance');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const destination = user?.phone ?? user?.email;
    if (!destination) throw new BadRequestException('No contact for OTP');

    const challenge = await this.otp.issue({
      destination,
      channel: user?.phone ? 'SMS' : 'EMAIL',
      purpose: 'SENSITIVE_ACTION',
      userId,
    });
    const transfer = await this.prisma.transfer.create({
      data: {
        fromAccountId,
        toAccountId,
        currency: input.currency,
        amountMinor: input.amountMinor,
        otpChallengeId: challenge.challengeId,
      },
    });
    return { transferId: transfer.id, challengeId: challenge.challengeId, devCode: challenge.devCode };
  }

  async confirmTransfer(fromAccountId: string, transferId: string, code: string) {
    const transfer = await this.prisma.transfer.findUnique({ where: { id: transferId } });
    if (!transfer || transfer.fromAccountId !== fromAccountId)
      throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'PENDING_OTP') throw new BadRequestException('Already processed');
    if (!transfer.otpChallengeId) throw new BadRequestException('No OTP challenge');

    const result = await this.otp.verify(transfer.otpChallengeId, code, 'SENSITIVE_ACTION');
    if (!result.ok) throw new BadRequestException(`OTP invalid: ${result.reason}`);

    const [fromWallet, toWallet] = await Promise.all([
      this.ledger.ensureWallet(transfer.fromAccountId),
      this.ledger.ensureWallet(transfer.toAccountId),
    ]);
    await this.prisma.$transaction(async (tx) => {
      await this.ledger.post({
        type: 'TRANSFER',
        note: `Transfer ${transfer.id}`,
        entries: [
          { walletId: fromWallet, currency: transfer.currency, amountMinor: -transfer.amountMinor },
          { walletId: toWallet, currency: transfer.currency, amountMinor: transfer.amountMinor },
        ],
        tx,
      });
      await tx.transfer.update({
        where: { id: transferId },
        data: { status: 'SENT', confirmedAt: new Date() },
      });
    });
    void this.notifications.notify(transfer.toAccountId, 'DEAL', 'You received a money transfer', {
      transferId,
    });
    return { ok: true };
  }

  /** Spec: recipient by email, phone, or exact Display Name. */
  private async resolveRecipient(recipient: string): Promise<string> {
    const trimmed = recipient.trim();
    if (trimmed.includes('@') || /^[+\d]/.test(trimmed)) {
      const lookup = normalizeIdentifier(trimmed);
      const user = await this.prisma.user.findUnique({
        where: lookup.email ? { email: lookup.email } : { phone: lookup.phone! },
        include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } },
      });
      const accountId = user?.memberships[0]?.accountId;
      if (!accountId) throw new NotFoundException('Recipient not found');
      return accountId;
    }
    const account = await this.prisma.account.findFirst({ where: { displayName: trimmed } });
    if (!account) throw new NotFoundException('Recipient not found');
    return account.id;
  }
}
