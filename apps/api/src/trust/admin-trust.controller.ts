import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminCredibilitySchema,
  decideVerificationSchema,
  type AdminCredibilityInput,
  type DecideVerificationInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../admin/guards/permissions.guard';
import { RequirePermissions } from '../admin/decorators/require-permissions.decorator';
import { VerificationsService } from './verifications.service';
import { CredibilityService } from './credibility.service';

@ApiTags('admin/trust')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin')
export class AdminTrustController {
  constructor(
    private readonly verifications: VerificationsService,
    private readonly credibility: CredibilityService,
  ) {}

  @Get('verifications')
  @RequirePermissions('verifications.review')
  @ApiOperation({ summary: 'Verification review queue' })
  queue(@Query('status') status?: 'NEW' | 'STUDYING' | 'NEEDS_REVIEW') {
    return this.verifications.queue(status);
  }

  @Post('verifications/:id/status')
  @HttpCode(200)
  @RequirePermissions('verifications.review')
  @ApiOperation({ summary: 'Move a verification: studying / verified / needs-review / rejected' })
  decide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(decideVerificationSchema)) body: DecideVerificationInput,
  ) {
    return this.verifications.decide(id, user.userId, body.status);
  }

  @Post('accounts/:accountId/credibility')
  @HttpCode(200)
  @RequirePermissions('users.write')
  @ApiOperation({ summary: 'Manual credibility adjustment (spec: admins add/deduct directly)' })
  async adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(adminCredibilitySchema)) body: AdminCredibilityInput,
  ) {
    await this.credibility.addEvent(accountId, 'ADMIN', body.points, {
      timeWeighted: false,
      note: body.note,
      recomputeNow: true,
    });
    return this.credibility.breakdown(accountId);
  }
}
