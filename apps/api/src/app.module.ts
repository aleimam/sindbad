import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AccountsModule } from './accounts/accounts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PreferencesModule } from './preferences/preferences.module';
import { CatalogModule } from './catalog/catalog.module';
import { MatchingModule } from './matching/matching.module';
import { MissionsModule } from './missions/missions.module';
import { DealsModule } from './deals/deals.module';
import { HealthModule } from './health/health.module';
import { MetaModule } from './meta/meta.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MessagingModule,
    AuthModule,
    AdminModule,
    AccountsModule,
    NotificationsModule,
    PreferencesModule,
    CatalogModule,
    MatchingModule,
    MissionsModule,
    DealsModule,
    HealthModule,
    MetaModule,
  ],
})
export class AppModule {}
