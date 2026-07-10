import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { AccountsModule } from '../accounts/accounts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ComplaintsService } from './complaints.service';
import { PagesService } from './pages.service';
import { AnalyticsService } from './analytics.service';
import { SupportController, PublicPagesController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';

// CredibilityService comes from the @Global TrustModule.
@Module({
  imports: [AuthModule, AdminModule, AccountsModule, NotificationsModule],
  controllers: [SupportController, PublicPagesController, AdminSupportController],
  providers: [ComplaintsService, PagesService, AnalyticsService],
  exports: [ComplaintsService],
})
export class SupportModule {}
