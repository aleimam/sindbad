import { createHmac, timingSafeEqual } from 'node:crypto';
import { Logger } from '@nestjs/common';
import {
  toMajorAmount,
  type CheckoutRequest,
  type CheckoutResult,
  type GatewayProvider,
  type PaymentGateway,
  type WebhookVerification,
} from './payment-gateway';

export interface KashierConfig {
  merchantId: string;
  apiKey: string;
  mode: string; // 'live' | 'test'
}

/**
 * Kashier hosted payment page (HPP). The checkout URL carries an HMAC-SHA256 hash
 * of `merchantId.orderId.amount.currency` signed with the payment API key; the
 * async webhook is verified with the same key.
 *
 * ⚠️ Verify the HPP base URL, param names, and webhook signature scheme against
 * your Kashier dashboard before go-live.
 */
export class KashierGateway implements PaymentGateway {
  readonly provider: GatewayProvider = 'KASHIER';
  private readonly logger = new Logger('KashierGateway');
  private static readonly HPP = 'https://checkout.kashier.io';

  constructor(private readonly config: KashierConfig) {}

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const amount = toMajorAmount(req.amountMinor);
    const hash = createHmac('sha256', this.config.apiKey)
      .update(`${this.config.merchantId}.${req.orderId}.${amount}.${req.currency}`)
      .digest('hex');

    const params = new URLSearchParams({
      merchantId: this.config.merchantId,
      orderId: req.orderId,
      amount,
      currency: req.currency,
      hash,
      mode: this.config.mode,
      merchantRedirect: req.redirectUrl,
      serverWebhook: req.webhookUrl,
      allowedMethods: 'card',
      display: 'en',
    });
    if (req.customerEmail) params.set('customerReference', req.customerEmail);

    // Synchronous URL build — no network call needed for the HPP.
    return { checkoutUrl: `${KashierGateway.HPP}/?${params.toString()}` };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): WebhookVerification {
    try {
      const provided = headers['x-kashier-signature'] ?? headers['x-kashier-signature'.toLowerCase()];
      const body = JSON.parse(rawBody) as {
        data?: {
          merchantOrderId?: string;
          orderId?: string;
          status?: string;
          paymentStatus?: string;
          amount?: number | string;
          currency?: string;
          transactionId?: string;
          kashierOrderId?: string;
        };
      };
      const d = body.data ?? {};
      const orderId = d.merchantOrderId ?? d.orderId;
      const amount = String(d.amount ?? '');
      const currency = d.currency ?? '';

      // Signature is HMAC-SHA256 over merchantId.orderId.amount.currency (same as HPP).
      const expected = createHmac('sha256', this.config.apiKey)
        .update(`${this.config.merchantId}.${orderId}.${amount}.${currency}`)
        .digest('hex');
      const ok = Boolean(provided) && safeEqualHex(provided!, expected);

      const raw = (d.paymentStatus ?? d.status ?? '').toUpperCase();
      const status: 'PAID' | 'FAILED' = raw === 'SUCCESS' || raw === 'PAID' ? 'PAID' : 'FAILED';

      return {
        ok,
        orderId,
        status,
        amountMinor: amount ? Math.round(Number(amount) * 100) : undefined,
        currency,
        gatewayRef: d.transactionId ?? d.kashierOrderId,
      };
    } catch (err) {
      this.logger.warn(`webhook parse failed: ${(err as Error).message}`);
      return { ok: false };
    }
  }
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
