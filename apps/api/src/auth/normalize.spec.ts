import { describe, expect, it } from 'vitest';
import { isEmail, normalizeEmail, normalizeIdentifier, normalizePhone } from '@sindbad/shared';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Ali@Example.COM ')).toBe('ali@example.com');
  });
});

describe('normalizePhone', () => {
  it('keeps E.164 numbers', () => {
    expect(normalizePhone('+201200003375')).toBe('+201200003375');
  });
  it('converts 00 prefix to +', () => {
    expect(normalizePhone('00201200003375')).toBe('+201200003375');
  });
  it('treats 01x numbers as Egyptian mobiles', () => {
    expect(normalizePhone('01200003375')).toBe('+201200003375');
  });
  it('strips separators', () => {
    expect(normalizePhone('+1 (302) 205-6500')).toBe('+13022056500');
  });
});

describe('normalizeIdentifier', () => {
  it('routes emails and phones', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(normalizeIdentifier('A@B.co')).toEqual({ email: 'a@b.co' });
    expect(normalizeIdentifier('0120 000 3375')).toEqual({ phone: '+201200003375' });
  });
});
