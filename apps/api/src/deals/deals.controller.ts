import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  cancelDealSchema,
  changeFeeSchema,
  partiallyFlagSchema,
  requestDealSchema,
  resolutionSchema,
  type CancelDealInput,
  type ChangeFeeInput,
  type PartiallyFlagInput,
  type RequestDealInput,
  type ResolutionInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { DealsService } from './deals.service';
import { FlagsService } from './flags.service';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(
    private readonly deals: DealsService,
    private readonly flags: FlagsService,
    private readonly accounts: AccountsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Request a deal between a trip and a shipment' })
  async request(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(requestDealSchema)) body: RequestDealInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.deals.request(accountId, body);
  }

  @Get('mine')
  @ApiOperation({ summary: 'All my deals (as traveler or shopper)' })
  async mine(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.deals.mine(accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Deal detail with the full event history' })
  async byId(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.deals.byId(id, accountId);
  }

  @Post(':id/fee')
  @HttpCode(200)
  @ApiOperation({ summary: 'Counter-offer the fee (negotiation)' })
  async changeFee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(changeFeeSchema)) body: ChangeFeeInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.deals.changeFee(id, accountId, body.feeUsd);
  }

  @Post(':id/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept the current offer (the other party only) → deal agreed' })
  async accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.deals.accept(id, accountId);
  }

  @Post(':id/advance')
  @HttpCode(200)
  @ApiOperation({ summary: 'Advance the next Box/Basket step (actor-guarded)' })
  async advance(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.deals.advance(id, accountId);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Shopper confirms receipt → deal completed' })
  async complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.deals.complete(id, accountId);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel — at Ordered+ becomes a staff-approved request' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelDealSchema)) body: CancelDealInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.deals.cancel(id, accountId, body.reason);
  }

  @Post(':id/flags/partially')
  @HttpCode(200)
  @ApiOperation({ summary: 'Traveler: some items are off-track (lost/damaged or delayed)' })
  async markPartially(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(partiallyFlagSchema)) body: PartiallyFlagInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.flags.markPartially(id, accountId, body.problem);
  }

  @Post(':id/resolution')
  @HttpCode(200)
  @ApiOperation({ summary: 'Propose or edit the resolution (dual approval)' })
  async proposeResolution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resolutionSchema)) body: ResolutionInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.flags.proposeResolution(id, accountId, body.text);
  }

  @Post(':id/resolution/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve the current resolution text → green flag' })
  async approveResolution(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.flags.approveResolution(id, accountId);
  }
}
