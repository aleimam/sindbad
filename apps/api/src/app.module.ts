import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AccountsModule } from './accounts/accounts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PreferencesModule } from './preferences/preferences.module';
import { MediaModule } from './media/media.module';
import { MoneyModule } from './money/money.module';
import { TrustModule } from './trust/trust.module';
import { ChatModule } from './chat/chat.module';
import { CatalogModule } from './catalog/catalog.module';
import { MatchingModule } from './matching/matching.module';
import { MissionsModule } from './missions/missions.module';
import { DealsModule } from './deals/deals.module';
import { SupportModule } from './support/support.module';
import { HealthModule } from './health/health.module';
import { MetaModule } from './meta/meta.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    // Global baseline rate limit (per client IP). Auth endpoints tighten this
    // further with @Throttle. Requires `trust proxy` (set in main.ts) so the
    // client IP — not Traefik's — is used behind the reverse proxy.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    MessagingModule,
    AuthModule,
    AdminModule,
    AccountsModule,
    NotificationsModule,
    PreferencesModule,
    MediaModule,
    MoneyModule,
    TrustModule,
    ChatModule,
    CatalogModule,
    MatchingModule,
    MissionsModule,
    DealsModule,
    SupportModule,
    HealthModule,
    MetaModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
