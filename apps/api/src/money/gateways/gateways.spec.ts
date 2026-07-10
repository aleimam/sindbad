import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { toMajorAmount } from './payment-gateway';
import { KashierGateway } from './kashier.gateway';
import { OpayGateway } from './opay.gateway';

describe('toMajorAmount', () => {
  it('converts minor units to a 2-dp string', () => {
    expect(toMajorAmount(2120)).toBe('21.20');
    expect(toMajorAmount(100000)).toBe('1000.00');
    expect(toMajorAmount(5)).toBe('0.05');
  });
});

describe('KashierGateway', () => {
  const gw = new KashierGateway({ merchantId: 'MID-1', apiKey: 'secret-key', mode: 'test' });

  it('builds a checkout URL with a valid HMAC hash', async () => {
    const { checkoutUrl } = await gw.createCheckout({
      orderId: 'SB-1',
      amountMinor: 2120,
      currency: 'USD',
      redirectUrl: 'https://sindbad.app/r',
      webhookUrl: 'https://api.sindbad.app/w',
    });
    const url = new URL(checkoutUrl);
    const expected = createHmac('sha256', 'secret-key').update('MID-1.SB-1.21.20.USD').digest('hex');
    expect(url.searchParams.get('hash')).toBe(expected);
    expect(url.searchParams.get('orderId')).toBe('SB-1');
  });

  it('accepts a correctly signed PAID webhook and rejects a tampered one', () => {
    const sign = (mid: string, order: string, amount: string, cur: string) =>
      createHmac('sha256', 'secret-key').update(`${mid}.${order}.${amount}.${cur}`).digest('hex');
    const body = JSON.stringify({
      data: { merchantOrderId: 'SB-1', paymentStatus: 'SUCCESS', amount: '21.20', currency: 'USD', transactionId: 'TX9' },
    });

    const good = gw.verifyWebhook(body, { 'x-kashier-signature': sign('MID-1', 'SB-1', '21.20', 'USD') });
    expect(good.ok).toBe(true);
    expect(good.status).toBe('PAID');
    expect(good.orderId).toBe('SB-1');
    expect(good.amountMinor).toBe(2120);

    const bad = gw.verifyWebhook(body, { 'x-kashier-signature': 'deadbeef' });
    expect(bad.ok).toBe(false);
  });
});

describe('OpayGateway', () => {
  const gw = new OpayGateway({ merchantId: 'M1', publicKey: 'pk', secretKey: 'sk', baseUrl: 'https://x' });

  it('verifies a correctly signed webhook and maps status', () => {
    const payload = { reference: 'SB-2', transactionId: 'T1', status: 'SUCCESS', amount: { total: 5000, currency: 'EGP' } };
    const sha512 = createHmac('sha512', 'sk').update(JSON.stringify(payload)).digest('hex');

    const good = gw.verifyWebhook(JSON.stringify({ payload, sha512 }), {});
    expect(good.ok).toBe(true);
    expect(good.status).toBe('PAID');
    expect(good.orderId).toBe('SB-2');
    expect(good.amountMinor).toBe(5000);

    const bad = gw.verifyWebhook(JSON.stringify({ payload, sha512: 'abcd' }), {});
    expect(bad.ok).toBe(false);
  });

  it('maps a non-success status to FAILED', () => {
    const payload = { reference: 'SB-3', status: 'FAILED', amount: { total: 100, currency: 'EGP' } };
    const sha512 = createHmac('sha512', 'sk').update(JSON.stringify(payload)).digest('hex');
    const r = gw.verifyWebhook(JSON.stringify({ payload, sha512 }), {});
    expect(r.ok).toBe(true);
    expect(r.status).toBe('FAILED');
  });
});
