import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { raiseComplaintSchema, type RaiseComplaintInput } from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { ComplaintsService } from './complaints.service';
import { AnalyticsService } from './analytics.service';
import { PagesService } from './pages.service';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SupportController {
  constructor(
    private readonly complaints: ComplaintsService,
    private readonly analytics: AnalyticsService,
    private readonly accounts: AccountsService,
  ) {}

  @Post('complaints')
  @ApiOperation({ summary: 'Raise a complaint against a request, deal, chat, or review' })
  async raise(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(raiseComplaintSchema)) body: RaiseComplaintInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.complaints.raise(accountId, body);
  }

  @Get('complaints/mine')
  async mine(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.complaints.mine(accountId);
  }

  @Get('analytics/me')
  @ApiOperation({ summary: 'My account performance — trips, shipments, deals' })
  async myAnalytics(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.analytics.forAccount(accountId);
  }
}

@ApiTags('pages')
@Controller('pages')
export class PublicPagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'List published static pages (public)' })
  list() {
    return this.pages.listPublished();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Read a published static page by slug (public)' })
  bySlug(@Param('slug') slug: string) {
    return this.pages.bySlug(slug);
  }
}
