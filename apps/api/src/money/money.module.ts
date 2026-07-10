import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { LedgerService } from './ledger.service';
import { FeesService } from './fees.service';
import { SettingsService } from './settings.service';
import { FxService } from './fx.service';
import { WalletOpsService } from './wallet-ops.service';
import { SmartService } from './smart.service';
import { PaymentsService } from './payments.service';
import { MoneyController } from './money.controller';
import { AdminFinanceController } from './admin-finance.controller';
import { PaymentsController } from './payments.controller';
import { PAYMENT_GATEWAYS, type PaymentGateway } from './gateways/payment-gateway';
import { KashierGateway, type KashierConfig } from './gateways/kashier.gateway';
import { OpayGateway, type OpayConfig } from './gateways/opay.gateway';

// Instantiate whichever gateways have credentials configured.
const paymentGatewaysProvider = {
  provide: PAYMENT_GATEWAYS,
  inject: [ConfigService],
  useFactory: (config: ConfigService): PaymentGateway[] => {
    const log = new Logger('Payments');
    const gateways: PaymentGateway[] = [];
    const k = config.get<KashierConfig>('payments.kashier');
    if (k?.merchantId && k?.apiKey) {
      gateways.push(new KashierGateway(k));
      log.log('Kashier gateway active.');
    }
    const o = config.get<OpayConfig>('payments.opay');
    if (o?.merchantId && o?.secretKey) {
      gateways.push(new OpayGateway(o));
      log.log('OPay gateway active.');
    }
    if (gateways.length === 0) {
      log.warn('No payment gateways configured — card deposits are disabled.');
    }
    return gateways;
  },
};

@Global()
@Module({
  imports: [AuthModule, AdminModule],
  controllers: [MoneyController, AdminFinanceController, PaymentsController],
  providers: [
    LedgerService,
    FeesService,
    SettingsService,
    FxService,
    WalletOpsService,
    SmartService,
    PaymentsService,
    paymentGatewaysProvider,
  ],
  exports: [LedgerService, FeesService, SettingsService, FxService, WalletOpsService, SmartService],
})
export class MoneyModule {}
