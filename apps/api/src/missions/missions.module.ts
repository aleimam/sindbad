import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { MatchingModule } from '../matching/matching.module';
import { DealsModule } from '../deals/deals.module';
import { MissionsService } from './missions.service';
import { TripsController } from './trips.controller';
import { ShipmentsController } from './shipments.controller';
import { AdminTripsController } from './admin-trips.controller';
import { AdminChangeRequestsController } from './admin-change-requests.controller';

@Module({
  imports: [AuthModule, AdminModule, MatchingModule, DealsModule],
  controllers: [
    TripsController,
    ShipmentsController,
    AdminTripsController,
    AdminChangeRequestsController,
  ],
  providers: [MissionsService],
})
export class MissionsModule {}
