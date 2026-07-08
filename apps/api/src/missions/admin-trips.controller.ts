import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../admin/guards/permissions.guard';
import { RequirePermissions } from '../admin/decorators/require-permissions.decorator';
import { MissionsService } from './missions.service';

@ApiTags('admin/trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/trips')
export class AdminTripsController {
  constructor(private readonly missions: MissionsService) {}

  @Get('pending')
  @RequirePermissions('trips.approve')
  @ApiOperation({ summary: 'Trip approval queue' })
  pending() {
    return this.missions.pendingTrips();
  }

  @Post(':id/approve')
  @RequirePermissions('trips.approve')
  approve(@Param('id') id: string) {
    return this.missions.approveTrip(id);
  }

  @Post(':id/reject')
  @RequirePermissions('trips.approve')
  reject(@Param('id') id: string) {
    return this.missions.rejectTrip(id);
  }
}
