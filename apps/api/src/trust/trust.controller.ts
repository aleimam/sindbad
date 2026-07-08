import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  requestVerificationSchema,
  reviewResponseSchema,
  submitReviewSchema,
  userFlagSchema,
  type RequestVerificationInput,
  type ReviewResponseInput,
  type SubmitReviewInput,
  type UserFlagInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { VerificationsService } from './verifications.service';
import { CredibilityService } from './credibility.service';
import { ReviewsService } from './reviews.service';
import { SocialService } from './social.service';

@ApiTags('trust')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TrustController {
  constructor(
    private readonly verifications: VerificationsService,
    private readonly credibility: CredibilityService,
    private readonly reviews: ReviewsService,
    private readonly social: SocialService,
    private readonly accounts: AccountsService,
  ) {}

  @Get('verifications/types')
  @ApiOperation({ summary: 'Verifiable details + my status per type (price, points, duration)' })
  async types(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.verifications.typesWithStatus(accountId);
  }

  @Post('verifications')
  @ApiOperation({ summary: 'Request a verification — the fee is charged (kept on rejection)' })
  async request(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(requestVerificationSchema)) body: RequestVerificationInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.verifications.request(accountId, body.typeKey, body.details);
  }

  @Get('verifications/mine')
  async mine(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.verifications.mine(accountId);
  }

  @Get('credibility')
  @ApiOperation({ summary: 'My score, tier, and the factor breakdown' })
  async myCredibility(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.credibility.breakdown(accountId);
  }

  // ── Reviews (blind, +12h … +12d) ──

  @Post('deals/:dealId/reviews')
  @ApiOperation({ summary: 'Review the other party (blind until both submit or window closes)' })
  async submitReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Body(new ZodValidationPipe(submitReviewSchema)) body: SubmitReviewInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.reviews.submit(dealId, accountId, body.stars, body.comment);
  }

  @Get('deals/:dealId/reviews')
  async dealReviews(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.reviews.forDeal(dealId, accountId);
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete my review (edits are not allowed)' })
  async deleteReview(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.reviews.remove(id, accountId);
  }

  @Post('reviews/:id/response')
  @HttpCode(200)
  @ApiOperation({ summary: 'Respond to a review of me (once, after reveal)' })
  async respond(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reviewResponseSchema)) body: ReviewResponseInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.reviews.respond(id, accountId, body.text);
  }

  // ── Flags & favorites ──

  @Put('accounts/:id/flag')
  @ApiOperation({ summary: 'Flag a user: outstanding / follow / block' })
  async setFlag(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userFlagSchema)) body: UserFlagInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.social.setFlag(accountId, id, body.kind);
  }

  @Delete('accounts/:id/flag')
  async clearFlag(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.social.clearFlag(accountId, id);
  }

  @Get('flags/mine')
  async myFlags(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.social.myFlags(accountId);
  }

  @Get('favorites')
  async favorites(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.social.favorites(accountId);
  }

  @Post('favorites/:id')
  async addFavorite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.social.addFavorite(accountId, id);
  }

  @Delete('favorites/:id')
  async removeFavorite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.social.removeFavorite(accountId, id);
  }

  // ── Public profile (the spec's "user details page") ──

  @Get('accounts/:id/profile')
  @ApiOperation({ summary: 'Public profile: display name, tier, score, active missions, reviews' })
  async publicProfile(@Param('id') id: string) {
    const [profile, reviews] = await Promise.all([
      this.social.publicProfile(id),
      this.reviews.forAccount(id),
    ]);
    return { ...profile, reviews };
  }
}
