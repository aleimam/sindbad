import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { LedgerService } from './ledger.service';
import { FeesService } from './fees.service';
import { SettingsService } from './settings.service';
import { FxService } from './fx.service';
import { WalletOpsService } from './wallet-ops.service';
import { SmartService } from './smart.service';
import { MoneyController } from './money.controller';
import { AdminFinanceController } from './admin-finance.controller';

@Global()
@Module({
  imports: [AuthModule, AdminModule],
  controllers: [MoneyController, AdminFinanceController],
  providers: [LedgerService, FeesService, SettingsService, FxService, WalletOpsService, SmartService],
  exports: [LedgerService, FeesService, SettingsService, FxService, WalletOpsService, SmartService],
})
export class MoneyModule {}
