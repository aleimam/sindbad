/**
 * Outbound messaging abstractions (docs/01 §5 — pluggable adapters).
 *
 * Real providers arrive later:
 *  - SMS: SMS Misr / WE for Egyptian numbers, Twilio / Infobip international,
 *    with automatic failover and the alternate-provider-on-resend rule.
 *  - Email: Postfix on the VPS.
 * Until credentials exist, the Dev providers log to the console.
 */

export interface SmsProvider {
  sendSms(to: string, body: string): Promise<void>;
}

export interface EmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
