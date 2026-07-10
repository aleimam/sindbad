/**
 * Outbound messaging abstractions (docs/01 §5 — pluggable adapters).
 *
 * Active adapters (see messaging.module.ts — chosen by config at boot):
 *  - Email: SMTP via nodemailer (SmtpEmailProvider) when SMTP_HOST is set.
 *  - SMS:   Twilio REST (TwilioSmsProvider) when TWILIO_ACCOUNT_SID is set.
 *  - Otherwise the Dev providers log codes to the console.
 *
 * Future: SMS Misr / WE for Egyptian numbers + Infobip, with automatic failover
 * and the alternate-provider-on-resend rule.
 */

export interface SmsProvider {
  sendSms(to: string, body: string): Promise<void>;
}

export interface EmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
