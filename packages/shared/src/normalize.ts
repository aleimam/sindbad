/** Identifier normalization — used by both API and clients so lookups always agree. */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalize a phone number to a compact E.164-like form: digits with a single leading '+'.
 * Accepts spaces, dashes, parentheses and '00' international prefix.
 * Numbers starting '01' (11 digits) are treated as Egyptian mobiles → +20…
 */
export function normalizePhone(phone: string): string {
  let p = phone.trim().replace(/[\s\-().]/g, '');
  if (p.startsWith('00')) p = `+${p.slice(2)}`;
  if (!p.startsWith('+')) {
    if (/^01\d{9}$/.test(p)) p = `+2${p}`; // Egyptian local mobile format
    else p = `+${p}`;
  }
  // Drop any stray non-digits after the leading +
  p = `+${p.slice(1).replace(/\D/g, '')}`;
  return p;
}

export function isEmail(identifier: string): boolean {
  return identifier.includes('@');
}

/** Split a login identifier into its normalized channel form. */
export function normalizeIdentifier(identifier: string): { email?: string; phone?: string } {
  return isEmail(identifier)
    ? { email: normalizeEmail(identifier) }
    : { phone: normalizePhone(identifier) };
}
