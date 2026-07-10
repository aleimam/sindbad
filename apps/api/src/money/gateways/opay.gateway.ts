import { createHmac, timingSafeEqual } from 'node:crypto';
import { Logger } from '@nestjs/common';
import {
  type CheckoutRequest,
  type CheckoutResult,
  type GatewayProvider,
  type PaymentGateway,
  type WebhookVerification,
} from './payment-gateway';

export interface OpayConfig {
  merchantId: string;
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

/**
 * OPay International Cashier. Creates a checkout via REST and returns the hosted
 * `cashierUrl`; the async webhook carries an HMAC-SHA512 signature over the
 * payload signed with the merchant secret key.
 *
 * ⚠️ Confirm the create endpoint path, amount unit, and webhook signature
 * serialization against your OPay merchant docs before go-live.
 */
export class OpayGateway implements PaymentGateway {
  readonly provider: GatewayProvider = 'OPAY';
  private readonly logger = new Logger('OpayGateway');

  constructor(private readonly config: OpayConfig) {}

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const body = {
      country: 'EG',
      reference: req.orderId,
      amount: { total: req.amountMinor, currency: req.currency }, // OPay total = minor units
      returnUrl: req.redirectUrl,
      callbackUrl: req.webhookUrl,
      cancelUrl: req.redirectUrl,
      displayName: 'Sindbad',
      payMethod: 'BankCard',
      customerVisitSource: 'web',
      evokeOpay: false,
      expireAt: 30,
    };

    const res = await fetch(`${this.config.baseUrl}/api/v1/international/cashier/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.publicKey}`,
        MerchantId: this.config.merchantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      data?: { cashierUrl?: string; orderNo?: string; reference?: string };
    };
    if (!res.ok || json.code !== '00000' || !json.data?.cashierUrl) {
      this.logger.error(`OPay create failed: ${res.status} ${JSON.stringify(json)}`);
      throw new Error(`OPay checkout failed: ${json.message ?? res.status}`);
    }
    return { checkoutUrl: json.data.cashierUrl, gatewayRef: json.data.orderNo };
  }

  verifyWebhook(rawBody: string, _headers: Record<string, string | undefined>): WebhookVerification {
    try {
      const envelope = JSON.parse(rawBody) as {
        payload?: {
          reference?: string;
          transactionId?: string;
          orderNo?: string;
          status?: string;
          amount?: { total?: number; currency?: string };
        };
        sha512?: string;
      };
      const payload = envelope.payload ?? {};

      // Signature = HMAC-SHA512 of the payload JSON, keyed by the merchant secret.
      const expected = createHmac('sha512', this.config.secretKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      const ok = Boolean(envelope.sha512) && safeEqualHex(envelope.sha512!, expected);

      const raw = (payload.status ?? '').toUpperCase();
      const status: 'PAID' | 'FAILED' = raw === 'SUCCESS' ? 'PAID' : 'FAILED';

      return {
        ok,
        orderId: payload.reference,
        status,
        amountMinor: payload.amount?.total,
        currency: payload.amount?.currency,
        gatewayRef: payload.transactionId ?? payload.orderNo,
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
