import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER, SMS_PROVIDER } from './messaging';
import { DevEmailProvider, DevSmsProvider } from './dev-providers';
import type { SmsProvider } from './messaging';
import {
  RoutingSmsProvider,
  SmsMisrProvider,
  SmtpEmailProvider,
  TwilioSmsProvider,
} from './real-providers';

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
        const log = new Logger('Messaging');
        const twilioCfg = config.get<{ sid: string }>('twilio');
        const misrCfg = config.get<{ username: string }>('smsMisr');
        const twilio: SmsProvider | null = twilioCfg?.sid
          ? new TwilioSmsProvider(config.get('twilio')!)
          : null;
        const misr: SmsProvider | null = misrCfg?.username
          ? new SmsMisrProvider(config.get('smsMisr')!)
          : null;

        if (misr && twilio) {
          log.log('SMS: SMS Misr (+20) + Twilio (international) router active.');
          return new RoutingSmsProvider(misr, twilio);
        }
        if (misr) {
          log.log('SMS: SMS Misr provider active (all numbers).');
          return misr;
        }
        if (twilio) {
          log.log('SMS: Twilio provider active (all numbers).');
          return twilio;
        }
        log.warn('SMS: no provider configured — using DEV logger (no real SMS sent).');
        return new DevSmsProvider();
      },
    },
  ],
  exports: [SMS_PROVIDER, EMAIL_PROVIDER],
})
export class MessagingModule {}
