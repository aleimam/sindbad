/**
 * RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30 s step) — dependency-free.
 * Compatible with Google Authenticator / Authy / 1Password.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(msg).digest();
  const offset = digest[digest.length - 1]! & 0xf;
  const code =
    (((digest[offset]! & 0x7f) << 24) |
      (digest[offset + 1]! << 16) |
      (digest[offset + 2]! << 8) |
      digest[offset + 3]!) %
    10 ** digits;
  return code.toString().padStart(digits, '0');
}

export function totp(secretB32: string, timeMs = Date.now(), stepSec = 30, digits = 6): string {
  const counter = Math.floor(timeMs / 1000 / stepSec);
  return hotp(base32Decode(secretB32), counter, digits);
}

/** Accepts the previous/current/next step (±1 window) to absorb clock drift. */
export function verifyTotp(secretB32: string, code: string, timeMs = Date.now()): boolean {
  const secret = base32Decode(secretB32);
  const counter = Math.floor(timeMs / 1000 / 30);
  for (const c of [counter - 1, counter, counter + 1]) {
    const expected = hotp(secret, c);
    if (
      expected.length === code.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(code))
    )
      return true;
  }
  return false;
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function otpauthUri(secretB32: string, accountLabel: string, issuer = 'Sindbad Admin') {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
