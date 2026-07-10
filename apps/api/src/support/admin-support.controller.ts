import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  complaintStatusSchema,
  createPageSchema,
  moderationActionSchema,
  updatePageSchema,
  type ComplaintStatusInput,
  type CreatePageInput,
  type ModerationActionInput,
  type UpdatePageInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../admin/guards/permissions.guard';
import { RequirePermissions } from '../admin/decorators/require-permissions.decorator';
import { ComplaintsService } from './complaints.service';
import { PagesService } from './pages.service';
import { AnalyticsService } from './analytics.service';

@ApiTags('admin/support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin')
export class AdminSupportController {
  constructor(
    private readonly complaints: ComplaintsService,
    private readonly pages: PagesService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ── Dashboard ──

  @Get('analytics/overview')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Platform KPIs for the admin dashboard' })
  overview() {
    return this.analytics.adminOverview();
  }

  // ── Complaints queue ──

  @Get('complaints')
  @RequirePermissions('complaints.handle')
  queue(@Query('status') status?: 'NEW' | 'UNDER_REVIEW') {
    return this.complaints.queue(status);
  }

  @Patch('complaints/:id/status')
  @RequirePermissions('complaints.handle')
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(complaintStatusSchema)) body: ComplaintStatusInput,
  ) {
    return this.complaints.setStatus(id, user.userId, body.status, body.decision);
  }

  @Post('moderation-actions')
  @RequirePermissions('users.block')
  @ApiOperation({ summary: 'Apply a punishment: deduct credibility / hold membership / block' })
  punish(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(moderationActionSchema)) body: ModerationActionInput,
  ) {
    return this.complaints.punish(body, user.userId);
  }

  // ── Static pages CMS ──

  @Get('pages')
  @RequirePermissions('pages.edit')
  listPages() {
    return this.pages.listAll();
  }

  @Post('pages')
  @RequirePermissions('pages.edit')
  createPage(@Body(new ZodValidationPipe(createPageSchema)) body: CreatePageInput) {
    return this.pages.create(body);
  }

  @Put('pages/:id')
  @RequirePermissions('pages.edit')
  updatePage(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePageSchema)) body: UpdatePageInput,
  ) {
    return this.pages.update(id, body);
  }

  @Delete('pages/:id')
  @RequirePermissions('pages.edit')
  removePage(@Param('id') id: string) {
    return this.pages.remove(id);
  }
}
