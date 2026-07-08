import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { feeEstimateSchema, type FeeEstimateInput } from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { LedgerService } from './ledger.service';
import { FeesService } from './fees.service';

@ApiTags('money')
@Controller()
export class MoneyController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly fees: FeesService,
    private readonly accounts: AccountsService,
  ) {}

  @Post('fees/estimate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Estimated fee for a prospective deal (B·T·W·C + F)' })
  estimate(@Body(new ZodValidationPipe(feeEstimateSchema)) body: FeeEstimateInput) {
    return this.fees.estimate(body);
  }

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My wallet balances (USD + EGP, minor units)' })
  async wallet(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ledger.getBalances(accountId);
  }

  @Get('wallet/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My latest ledger entries' })
  async transactions(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ledger.getStatement(accountId);
  }
}
