import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailProvider, SmsProvider } from './messaging';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/** Transactional email over SMTP (works with SES, Resend, Brevo, Mailgun, self-hosted, …). */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly logger = new Logger('SmtpEmail');
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: SmtpConfig) {
    this.from = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text: body });
    } catch (err) {
      // Surface but don't crash the caller; OTP/notification flows treat send as best-effort.
      this.logger.error(`SMTP send to ${to} failed: ${(err as Error).message}`);
      throw err;
    }
  }
}

interface TwilioConfig {
  sid: string;
  token: string;
  from: string;
}

/** SMS via Twilio's REST API (no SDK — plain fetch with Basic auth). */
@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger('TwilioSms');

  constructor(private readonly config: TwilioConfig) {}

  async sendSms(to: string, body: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.sid}/Messages.json`;
    const auth = Buffer.from(`${this.config.sid}:${this.config.token}`).toString('base64');
    const form = new URLSearchParams({ To: to, Body: body });
    // `from` may be a phone number (From) or a Messaging Service SID (MessagingServiceSid).
    if (this.config.from.startsWith('MG')) form.set('MessagingServiceSid', this.config.from);
    else form.set('From', this.config.from);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(`Twilio send to ${to} failed (${res.status}): ${detail}`);
      throw new Error(`Twilio SMS failed: ${res.status}`);
    }
  }
}
