import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER, SMS_PROVIDER } from './messaging';
import { DevEmailProvider, DevSmsProvider } from './dev-providers';
import { SmtpEmailProvider, TwilioSmsProvider } from './real-providers';

/**
 * Wires the outbound channels. Real providers activate automatically when their
 * credentials are present (SMTP_HOST / TWILIO_ACCOUNT_SID); otherwise the dev
 * loggers are used. This lets the same build run locally and in production.
 */
@Global()
@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const smtp = config.get<{ host: string }>('smtp');
        if (smtp?.host) {
          new Logger('Messaging').log('Email: SMTP provider active.');
          return new SmtpEmailProvider(config.get('smtp')!);
        }
        new Logger('Messaging').warn('Email: no SMTP_HOST — using DEV logger (no real mail sent).');
        return new DevEmailProvider();
      },
    },
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const twilio = config.get<{ sid: string }>('twilio');
        if (twilio?.sid) {
          new Logger('Messaging').log('SMS: Twilio provider active.');
          return new TwilioSmsProvider(config.get('twilio')!);
        }
        new Logger('Messaging').warn(
          'SMS: no TWILIO_ACCOUNT_SID — using DEV logger (no real SMS sent).',
        );
        return new DevSmsProvider();
      },
    },
  ],
  exports: [SMS_PROVIDER, EMAIL_PROVIDER],
})
export class MessagingModule {}
