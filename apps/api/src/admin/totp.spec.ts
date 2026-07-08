import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, hotp, totp, verifyTotp, generateTotpSecret } from './totp';

// RFC 6238 Appendix B test vectors (SHA-1, 8 digits, secret = ASCII "12345678901234567890")
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');
const RFC_SECRET_B32 = base32Encode(RFC_SECRET);

describe('base32', () => {
  it('round-trips', () => {
    const buf = Buffer.from('hello world totp secret!', 'ascii');
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });
});

describe('totp — RFC 6238 vectors', () => {
  const vectors: Array<[number, string]> = [
    [59_000, '94287082'],
    [1_111_111_109_000, '07081804'],
    [1_111_111_111_000, '14050471'],
    [1_234_567_890_000, '89005924'],
    [2_000_000_000_000, '69279037'],
  ];
  for (const [timeMs, expected] of vectors) {
    it(`t=${timeMs / 1000}s → ${expected}`, () => {
      expect(totp(RFC_SECRET_B32, timeMs, 30, 8)).toBe(expected);
    });
  }
});

describe('verifyTotp', () => {
  it('accepts the current code and ±1 step', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, totp(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now + 30_000), now)).toBe(true);
  });

  it('rejects a code two steps old and wrong codes', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, totp(secret, now - 90_000), now)).toBe(false);
    expect(verifyTotp(secret, '000000', now)).toBe(
      totp(secret, now) === '000000' ||
        totp(secret, now - 30_000) === '000000' ||
        totp(secret, now + 30_000) === '000000',
    );
  });

  it('hotp matches RFC 4226 vector 0', () => {
    expect(hotp(RFC_SECRET, 0, 6)).toBe('755224');
  });
});
