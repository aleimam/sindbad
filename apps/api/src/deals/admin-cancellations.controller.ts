import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../admin/guards/permissions.guard';
import { RequirePermissions } from '../admin/decorators/require-permissions.decorator';
import { DealsService } from './deals.service';

@ApiTags('admin/cancellations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/cancellations')
export class AdminCancellationsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @RequirePermissions('deals.intervene')
  @ApiOperation({ summary: 'Pending shopper-cancellation requests' })
  pending() {
    return this.deals.listPendingCancellations();
  }

  @Post(':id/approve')
  @HttpCode(200)
  @RequirePermissions('deals.intervene')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deals.decideCancellation(id, user.userId, true);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @RequirePermissions('deals.intervene')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deals.decideCancellation(id, user.userId, false);
  }
}
