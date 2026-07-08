import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { CredibilityService } from './credibility.service';
import { VerificationsService } from './verifications.service';
import { TrustController } from './trust.controller';
import { AdminTrustController } from './admin-trust.controller';

@Global()
@Module({
  imports: [AuthModule, AdminModule],
  controllers: [TrustController, AdminTrustController],
  providers: [CredibilityService, VerificationsService],
  exports: [CredibilityService, VerificationsService],
})
export class TrustModule {}
