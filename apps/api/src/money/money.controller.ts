import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  bankAccountSchema,
  createDepositSchema,
  feeEstimateSchema,
  submitDepositSchema,
  transferConfirmSchema,
  transferInitiateSchema,
  withdrawalSchema,
  type BankAccountInput,
  type CreateDepositInput,
  type FeeEstimateInput,
  type SubmitDepositInput,
  type TransferConfirmInput,
  type TransferInitiateInput,
  type WithdrawalInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { LedgerService } from './ledger.service';
import { FeesService } from './fees.service';
import { WalletOpsService } from './wallet-ops.service';

@ApiTags('money')
@Controller()
export class MoneyController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly fees: FeesService,
    private readonly ops: WalletOpsService,
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

  // ── Deposits ──

  @Post('wallet/deposits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start an Instapay/bank deposit (returns the reference code)' })
  async createDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createDepositSchema)) body: CreateDepositInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ops.createDeposit(accountId, body);
  }

  @Post('wallet/deposits/:id/submit')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit the transfer reference number → staff review' })
  async submitDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(submitDepositSchema)) body: SubmitDepositInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ops.submitDepositReference(accountId, id, body.userReference);
  }

  @Get('wallet/deposits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async myDeposits(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ops.myDeposits(accountId);
  }

  // ── Bank accounts & withdrawals ──

  @Post('wallet/bank-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async addBankAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(bankAccountSchema)) body: BankAccountInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ops.addBankAccount(accountId, body);
  }

  @Get('wallet/bank-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async myBankAccounts(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ops.myBankAccounts(accountId);
  }

  @Post('wallet/withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a withdrawal — funds are held immediately' })
  async requestWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(withdrawalSchema)) body: WithdrawalInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ops.requestWithdrawal(accountId, body);
  }

  @Get('wallet/withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async myWithdrawals(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ops.myWithdrawals(accountId);
  }

  // ── Transfers (OTP-verified) ──

  @Post('wallet/transfer/initiate')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a transfer (recipient by email / phone / display name) → OTP' })
  async initiateTransfer(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(transferInitiateSchema)) body: TransferInitiateInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ops.initiateTransfer(user.userId, accountId, body);
  }

  @Post('wallet/transfer/confirm')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async confirmTransfer(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(transferConfirmSchema)) body: TransferConfirmInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.ops.confirmTransfer(accountId, body.transferId, body.code);
  }
}
