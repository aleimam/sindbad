import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { MatchingModule } from '../matching/matching.module';
import { DealsController } from './deals.controller';
import { AdminCancellationsController } from './admin-cancellations.controller';
import { DealsService } from './deals.service';
import { FlagsService } from './flags.service';

@Module({
  imports: [AuthModule, AdminModule, MatchingModule],
  controllers: [DealsController, AdminCancellationsController],
  providers: [DealsService, FlagsService],
  exports: [DealsService, FlagsService],
})
export class DealsModule {}
