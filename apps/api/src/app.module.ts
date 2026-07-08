import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { MetaModule } from './meta/meta.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    MessagingModule,
    AuthModule,
    AdminModule,
    HealthModule,
    MetaModule,
  ],
})
export class AppModule {}
