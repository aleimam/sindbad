import { Injectable, Logger } from '@nestjs/common';
import type { EmailProvider, SmsProvider } from './messaging';

@Injectable()
export class DevSmsProvider implements SmsProvider {
  private readonly logger = new Logger('DevSms');

  async sendSms(to: string, body: string): Promise<void> {
    this.logger.log(`[DEV SMS → ${to}] ${body}`);
  }
}

@Injectable()
export class DevEmailProvider implements EmailProvider {
  private readonly logger = new Logger('DevEmail');

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`[DEV EMAIL → ${to}] ${subject}: ${body}`);
  }
}
