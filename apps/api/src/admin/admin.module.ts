import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [AuthModule],
  controllers: [AdminAuthController, TeamsController],
  providers: [AdminAuthService, TeamsService, PermissionsService, PermissionsGuard],
  exports: [PermissionsService],
})
export class AdminModule {}
