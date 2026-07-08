import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminAdjustSchema,
  feeConfigSchema,
  fxManualRateSchema,
  type AdminAdjustInput,
  type FeeConfigInput,
  type FxManualRateInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../admin/guards/permissions.guard';
import { RequirePermissions } from '../admin/decorators/require-permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { WalletOpsService } from './wallet-ops.service';
import { FxService } from './fx.service';
import { SettingsService } from './settings.service';
import { SmartService } from './smart.service';

@ApiTags('admin/finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/finance')
export class AdminFinanceController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly ops: WalletOpsService,
    private readonly fx: FxService,
    private readonly settings: SettingsService,
    private readonly smart: SmartService,
    private readonly prisma: PrismaService,
  ) {}

  // ── SMART recalibration (pricing.smart.approve) ──

  @Get('smart')
  @RequirePermissions('pricing.smart.approve')
  @ApiOperation({ summary: 'SMART recalibration proposals (monthly job output)' })
  smartProposals() {
    return this.smart.listProposals();
  }

  @Post('smart/run')
  @HttpCode(200)
  @RequirePermissions('pricing.smart.approve')
  @ApiOperation({ summary: 'Run the recalibration now (normally monthly)' })
  runSmart() {
    return this.smart.buildProposal();
  }

  @Post('smart/:id/approve')
  @HttpCode(200)
  @RequirePermissions('pricing.smart.approve')
  approveSmart(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.smart.decide(id, user.userId, true);
  }

  @Post('smart/:id/reject')
  @HttpCode(200)
  @RequirePermissions('pricing.smart.approve')
  rejectSmart(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.smart.decide(id, user.userId, false);
  }

  // ── Deposits queue (finance.deposits) ──

  @Get('deposits')
  @RequirePermissions('finance.deposits')
  @ApiOperation({ summary: 'Deposits awaiting reference matching' })
  pendingDeposits() {
    return this.ops.pendingDeposits();
  }

  @Post('deposits/:id/confirm')
  @HttpCode(200)
  @RequirePermissions('finance.deposits')
  confirmDeposit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ops.decideDeposit(id, user.userId, true);
  }

  @Post('deposits/:id/reject')
  @HttpCode(200)
  @RequirePermissions('finance.deposits')
  rejectDeposit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ops.decideDeposit(id, user.userId, false);
  }

  // ── Withdrawals queue (finance.withdrawals) ──

  @Get('withdrawals')
  @RequirePermissions('finance.withdrawals')
  @ApiOperation({ summary: 'Withdrawals awaiting execution (funds already held)' })
  pendingWithdrawals() {
    return this.ops.pendingWithdrawals();
  }

  @Post('withdrawals/:id/paid')
  @HttpCode(200)
  @RequirePermissions('finance.withdrawals')
  markPaid(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ops.decideWithdrawal(id, user.userId, true);
  }

  @Post('withdrawals/:id/reject')
  @HttpCode(200)
  @RequirePermissions('finance.withdrawals')
  rejectWithdrawal(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ops.decideWithdrawal(id, user.userId, false);
  }

  // ── FX (finance.fx) ──

  @Get('fx')
  @RequirePermissions('finance.fx')
  async fxStatus() {
    const [latest, spreadPct] = await Promise.all([
      this.prisma.fxRate.findFirst({ orderBy: { day: 'desc' } }),
      this.settings.getFxSpreadPct(),
    ]);
    return { latest, spreadPct };
  }

  @Put('fx/rate')
  @RequirePermissions('finance.fx')
  setRate(@Body(new ZodValidationPipe(fxManualRateSchema)) body: FxManualRateInput) {
    return this.fx.setManualRate(body.usdToEgp);
  }

  @Put('fx/spread')
  @RequirePermissions('finance.fx')
  async setSpread(@Body() body: { spreadPct: number }) {
    const value = Number(body.spreadPct);
    if (!Number.isFinite(value) || value < 0 || value > 20) return { error: 'spreadPct 0–20' };
    await this.settings.set('fx.spreadPct', value);
    return { ok: true, spreadPct: value };
  }

  @Post('adjust')
  @HttpCode(200)
  @RequirePermissions('finance.adjustments')
  @ApiOperation({ summary: 'Manual wallet credit/debit (counter-leg: company bank)' })
  async adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(adminAdjustSchema)) body: AdminAdjustInput,
  ) {
    const walletId = await this.ledger.ensureWallet(body.accountId);
    return this.ledger.post({
      type: 'ADMIN_ADJUSTMENT',
      actorUserId: user.userId,
      note: body.note,
      entries: [
        { walletId, currency: body.currency, amountMinor: body.amountMinor },
        { systemAccount: 'COMPANY_BANK', currency: body.currency, amountMinor: -body.amountMinor },
      ],
    });
  }

  @Get('fee-config')
  @RequirePermissions('pricing.edit')
  feeConfig() {
    return this.prisma.feeConfig.upsert({ where: { id: 'GLOBAL' }, create: { id: 'GLOBAL' }, update: {} });
  }

  @Put('fee-config')
  @RequirePermissions('pricing.edit')
  updateFeeConfig(@Body(new ZodValidationPipe(feeConfigSchema)) body: FeeConfigInput) {
    return this.prisma.feeConfig.upsert({
      where: { id: 'GLOBAL' },
      create: { id: 'GLOBAL', ...body },
      update: body,
    });
  }

  @Get('ledger')
  @RequirePermissions('finance.ledger')
  @ApiOperation({ summary: 'Latest ledger transactions (all accounts)' })
  latest() {
    return this.prisma.ledgerTransaction.findMany({
      include: { entries: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
