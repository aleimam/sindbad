import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { cardDepositSchema, type CardDepositInput } from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { PaymentsService } from './payments.service';
import type { GatewayProvider } from './gateways/payment-gateway';

@ApiTags('payments')
@Controller('wallet')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly accounts: AccountsService,
  ) {}

  @Get('gateways')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active card-payment gateways (empty until credentials set)' })
  gateways() {
    return { providers: this.payments.activeProviders() };
  }

  @Post('deposits/card')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a card deposit; returns a hosted-checkout URL' })
  async startCardDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(cardDepositSchema)) body: CardDepositInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.payments.createGatewayDeposit(accountId, body);
  }

  // Public webhook — the gateway calls this server-to-server. No auth; verified by
  // signature inside the adapter. Throttling is skipped so bursts aren't dropped.
  @Post('gateways/:provider/webhook')
  @SkipThrottle()
  @HttpCode(200)
  @ApiOperation({ summary: 'Payment gateway webhook (signature-verified)' })
  async webhook(@Param('provider') provider: string, @Req() req: Request) {
    const raw =
      (req as Request & { rawBody?: Buffer }).rawBody?.toString('utf8') ??
      JSON.stringify(req.body ?? {});
    const headers = req.headers as Record<string, string | undefined>;
    return this.payments.handleWebhook(provider.toUpperCase() as GatewayProvider, raw, headers);
  }
}
