import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type ResetPasswordInput,
  type VerifyOtpInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AuthService, type SessionMeta } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from './cookies';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private meta(req: Request): SessionMeta {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  private get secureCookies(): boolean {
    return this.config.get<string>('env') === 'production';
  }

  // Tight limits on OTP-issuing + credential endpoints: brute-force and, once SMS
  // is live, SMS-bombing / cost-abuse protection (per client IP).
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register with email or phone + password; sends a verification OTP' })
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify the registration OTP; returns tokens (auto-login)' })
  async verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpSchema)) body: VerifyOtpInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.verifyRegistration(body, this.meta(req));
    setAuthCookies(res, tokens, this.secureCookies);
    return tokens;
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email or phone + password' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(body, this.meta(req));
    setAuthCookies(res, tokens, this.secureCookies);
    return tokens;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the refresh token (body or httpOnly cookie)' })
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fromCookie = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      REFRESH_COOKIE
    ];
    const token = body.refreshToken ?? fromCookie;
    const tokens = await this.auth.refresh(token ?? '', this.meta(req));
    setAuthCookies(res, tokens, this.secureCookies);
    return tokens;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke the current session' })
  async logout(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fromCookie = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      REFRESH_COOKIE
    ];
    const token = body.refreshToken ?? fromCookie;
    clearAuthCookies(res);
    return token ? this.auth.logout(token) : { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user + account memberships' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.userId);
  }

  @Post('password/forgot')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Start a password reset (OTP to email or phone)' })
  forgot(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput) {
    return this.auth.forgotPassword(body);
  }

  @Post('password/reset')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete a password reset; revokes all sessions' })
  reset(@Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput) {
    return this.auth.resetPassword(body);
  }
}
