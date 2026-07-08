import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { OtpService } from './otp.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, OtpService, JwtAuthGuard],
  exports: [AuthService, TokenService, JwtAuthGuard, OtpService, PasswordService],
})
export class AuthModule {}
