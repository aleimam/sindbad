import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { requestVerificationSchema, type RequestVerificationInput } from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { VerificationsService } from './verifications.service';
import { CredibilityService } from './credibility.service';

@ApiTags('trust')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TrustController {
  constructor(
    private readonly verifications: VerificationsService,
    private readonly credibility: CredibilityService,
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
}
