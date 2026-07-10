import { describe, expect, it } from 'vitest';
import { RoutingSmsProvider } from './real-providers';
import type { SmsProvider } from './messaging';

class Spy implements SmsProvider {
  calls: Array<{ to: string; body: string }> = [];
  async sendSms(to: string, body: string) {
    this.calls.push({ to, body });
  }
}

describe('RoutingSmsProvider', () => {
  it('routes Egyptian (+20) numbers to the Egypt provider', async () => {
    const eg = new Spy();
    const intl = new Spy();
    await new RoutingSmsProvider(eg, intl).sendSms('+201001234567', 'code 1');
    expect(eg.calls).toHaveLength(1);
    expect(intl.calls).toHaveLength(0);
  });

  it('routes non-Egyptian numbers to the international provider', async () => {
    const eg = new Spy();
    const intl = new Spy();
    await new RoutingSmsProvider(eg, intl).sendSms('+14155550123', 'code 2');
    expect(intl.calls).toHaveLength(1);
    expect(eg.calls).toHaveLength(0);
  });

  it('tolerates spaces in the number', async () => {
    const eg = new Spy();
    const intl = new Spy();
    await new RoutingSmsProvider(eg, intl).sendSms('+20 100 123 4567', 'code 3');
    expect(eg.calls).toHaveLength(1);
  });
});
