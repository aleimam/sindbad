import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { LedgerService } from './ledger.service';
import { FeesService } from './fees.service';
import { MoneyController } from './money.controller';
import { AdminFinanceController } from './admin-finance.controller';

@Global()
@Module({
  imports: [AuthModule, AdminModule],
  controllers: [MoneyController, AdminFinanceController],
  providers: [LedgerService, FeesService],
  exports: [LedgerService, FeesService],
})
export class MoneyModule {}
