import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { OtpService } from './otp.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccountAccessGuard } from './guards/account-access.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    OtpService,
    JwtAuthGuard,
    { provide: APP_GUARD, useClass: AccountAccessGuard },
  ],
  exports: [AuthService, TokenService, JwtAuthGuard, OtpService, PasswordService],
})
export class AuthModule {}
