import { Body, Controller, Get, HttpCode, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminAdjustSchema,
  feeConfigSchema,
  type AdminAdjustInput,
  type FeeConfigInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../admin/guards/permissions.guard';
import { RequirePermissions } from '../admin/decorators/require-permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';

@ApiTags('admin/finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/finance')
export class AdminFinanceController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly prisma: PrismaService,
  ) {}

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
