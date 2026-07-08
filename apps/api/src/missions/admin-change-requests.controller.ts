import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../admin/guards/permissions.guard';
import { RequirePermissions } from '../admin/decorators/require-permissions.decorator';
import { MissionsService } from './missions.service';

@ApiTags('admin/edit-approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/change-requests')
export class AdminChangeRequestsController {
  constructor(private readonly missions: MissionsService) {}

  @Get()
  @RequirePermissions('editApprovals.review')
  @ApiOperation({ summary: 'Edit Approvals queue (shows before → after)' })
  list(@Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.missions.listChangeRequests(status ?? 'PENDING');
  }

  @Post(':id/approve')
  @HttpCode(200)
  @RequirePermissions('editApprovals.review')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.missions.decideChangeRequest(id, user.userId, true);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @RequirePermissions('editApprovals.review')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.missions.decideChangeRequest(id, user.userId, false);
  }
}
