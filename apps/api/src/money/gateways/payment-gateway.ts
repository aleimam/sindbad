/**
 * Payment-gateway abstraction for CARD deposits (docs/02 §3).
 *
 * Two adapters ship: Kashier and OPay (both Egyptian). Each activates only when
 * its credentials are configured; the registry ({@link PAYMENT_GATEWAYS}) exposes
 * whichever are active. The internal flow (PaymentsService → ledger) is provider-
 * agnostic; only createCheckout/verifyWebhook are provider-specific.
 *
 * ⚠️ The exact endpoint URLs, field names, and signature formulas below follow the
 * providers' public docs but MUST be confirmed against the live merchant account
 * before go-live (same caveat as the SMS Misr adapter).
 */
export type GatewayProvider = 'KASHIER' | 'OPAY';

export interface CheckoutRequest {
  orderId: string; // our DepositRequest.referenceCode
  amountMinor: number; // integer minor units (cents / piasters)
  currency: string; // 'USD' | 'EGP'
  customerEmail?: string;
  redirectUrl: string; // where the gateway returns the user after payment
  webhookUrl: string; // where the gateway POSTs the async result
}

export interface CheckoutResult {
  checkoutUrl: string; // send the user here to pay
  gatewayRef?: string; // the gateway's own order/session id, if returned now
}

export interface WebhookVerification {
  ok: boolean; // signature valid?
  orderId?: string; // our referenceCode, extracted from the payload
  status?: 'PAID' | 'FAILED';
  amountMinor?: number; // as reported by the gateway (for cross-checking)
  currency?: string;
  gatewayRef?: string; // the gateway's transaction id
}

export interface PaymentGateway {
  readonly provider: GatewayProvider;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  /** Verify signature + parse an incoming webhook. Never throws — returns ok:false. */
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): WebhookVerification;
}

/** DI token: an array of the payment gateways that are configured/active. */
export const PAYMENT_GATEWAYS = Symbol('PAYMENT_GATEWAYS');

/** Minor units → the major-unit decimal string most gateways expect ("21.20"). */
export function toMajorAmount(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}
