import { Global, Module } from '@nestjs/common';
import { EMAIL_PROVIDER, SMS_PROVIDER } from './messaging';
import { DevEmailProvider, DevSmsProvider } from './dev-providers';

@Global()
@Module({
  providers: [
    { provide: SMS_PROVIDER, useClass: DevSmsProvider },
    { provide: EMAIL_PROVIDER, useClass: DevEmailProvider },
  ],
  exports: [SMS_PROVIDER, EMAIL_PROVIDER],
})
export class MessagingModule {}
