import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import type { Currency } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LedgerService } from './ledger.service';
import { SettingsService } from './settings.service';
import { limitError } from './limits';
import { PAYMENT_GATEWAYS, type GatewayProvider, type PaymentGateway } from './gateways/payment-gateway';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_GATEWAYS) private readonly gateways: PaymentGateway[],
  ) {}

  /** Which gateways are configured/active (for the client to render deposit options). */
  activeProviders(): GatewayProvider[] {
    return this.gateways.map((g) => g.provider);
  }

  private gatewayFor(provider: GatewayProvider): PaymentGateway {
    const gw = this.gateways.find((g) => g.provider === provider);
    if (!gw) throw new BadRequestException(`Payment method ${provider} is not available`);
    return gw;
  }

  /** Start a CARD deposit: create the pending request + a hosted-checkout URL. */
  async createGatewayDeposit(
    accountId: string,
    input: { currency: Currency; amountMinor: number; provider: GatewayProvider },
    customerEmail?: string,
  ) {
    const limits = await this.settings.getMoneyLimits();
    const err = limitError(limits, input.currency, input.amountMinor);
    if (err) throw new BadRequestException(err);

    const gateway = this.gatewayFor(input.provider);
    const referenceCode = `SB-${randomInt(100000, 999999)}-${Date.now().toString(36).toUpperCase()}`;
    const deposit = await this.prisma.depositRequest.create({
      data: {
        accountId,
        currency: input.currency,
        amountMinor: input.amountMinor,
        method: 'CARD',
        gateway: input.provider,
        referenceCode,
      },
    });

    const publicApi = this.config.get<string>('payments.publicApiUrl') ?? '';
    const webUrl = this.config.get<string>('payments.webUrl') ?? '';
    const checkout = await gateway.createCheckout({
      orderId: referenceCode,
      amountMinor: input.amountMinor,
      currency: input.currency,
      customerEmail,
      redirectUrl: `${webUrl}/account/wallet?deposit=${deposit.id}`,
      webhookUrl: `${publicApi}/api/wallet/gateways/${input.provider.toLowerCase()}/webhook`,
    });

    if (checkout.gatewayRef) {
      await this.prisma.depositRequest.update({
        where: { id: deposit.id },
        data: { gatewayRef: checkout.gatewayRef },
      });
    }
    return { depositId: deposit.id, referenceCode, checkoutUrl: checkout.checkoutUrl };
  }

  /**
   * Handle a gateway webhook: verify signature, then credit the wallet exactly once.
   * Idempotent + atomic — a guarded status transition prevents double-crediting on
   * duplicate deliveries, and the ledger post shares the same transaction.
   */
  async handleWebhook(
    provider: GatewayProvider,
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<{ ok: boolean }> {
    const gateway = this.gatewayFor(provider);
    const v = gateway.verifyWebhook(rawBody, headers);
    if (!v.ok || !v.orderId) {
      this.logger.warn(`${provider} webhook: invalid signature or missing order id`);
      return { ok: false };
    }

    const deposit = await this.prisma.depositRequest.findUnique({
      where: { referenceCode: v.orderId },
    });
    if (!deposit || deposit.gateway !== provider) {
      this.logger.warn(`${provider} webhook: unknown order ${v.orderId}`);
      return { ok: false };
    }
    if (deposit.status !== 'REQUESTED') {
      return { ok: true }; // already CONFIRMED/REJECTED — idempotent no-op
    }

    if (v.status !== 'PAID') {
      // updateMany (not update): a status-guarded, race-safe transition that never
      // throws P2025 if a concurrent webhook already moved the deposit.
      const rejected = await this.prisma.depositRequest.updateMany({
        where: { id: deposit.id, status: 'REQUESTED' },
        data: { status: 'REJECTED', gatewayRef: v.gatewayRef ?? deposit.gatewayRef, decidedAt: new Date() },
      });
      if (rejected.count > 0) {
        void this.notifications.notify(deposit.accountId, 'DEAL', 'Your card deposit did not complete', {
          depositId: deposit.id,
        });
      }
      return { ok: true };
    }

    // Cross-check the amount the gateway actually charged.
    if (v.amountMinor != null && v.amountMinor !== deposit.amountMinor) {
      this.logger.error(
        `${provider} webhook: amount mismatch for ${v.orderId} — expected ${deposit.amountMinor}, got ${v.amountMinor}. Left for review.`,
      );
      return { ok: false };
    }

    const walletId = await this.ledger.ensureWallet(deposit.accountId);
    await this.prisma.$transaction(async (tx) => {
      // Claim the deposit; count 0 means a concurrent webhook already did it.
      const claimed = await tx.depositRequest.updateMany({
        where: { id: deposit.id, status: 'REQUESTED' },
        data: { status: 'CONFIRMED', gatewayRef: v.gatewayRef ?? deposit.gatewayRef, decidedAt: new Date() },
      });
      if (claimed.count === 0) return;
      await this.ledger.post({
        type: 'DEPOSIT',
        note: `Card deposit ${deposit.referenceCode} via ${provider}`,
        tx,
        entries: [
          { systemAccount: 'GATEWAY_CLEARING', currency: deposit.currency, amountMinor: -deposit.amountMinor },
          { walletId, currency: deposit.currency, amountMinor: deposit.amountMinor },
        ],
      });
    });

    void this.notifications.notify(deposit.accountId, 'DEAL', 'Your deposit was confirmed', {
      depositId: deposit.id,
    });
    return { ok: true };
  }
}
