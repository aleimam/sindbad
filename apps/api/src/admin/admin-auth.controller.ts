import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  enable2faSchema,
  loginSchema,
  verify2faSchema,
  type Enable2faInput,
  type LoginInput,
  type Verify2faInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { setAuthCookies } from '../auth/cookies';
import { AdminAuthService } from './admin-auth.service';
import { PermissionsService } from './permissions.service';

@ApiTags('admin/auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuth: AdminAuthService,
    private readonly permissions: PermissionsService,
    private readonly config: ConfigService,
  ) {}

  private get secureCookies(): boolean {
    return this.config.get<string>('env') === 'production';
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Staff login — returns a 2FA challenge when enrolled' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminAuth.login(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (!result.pending2fa) setAuthCookies(res, result, this.secureCookies);
    return result;
  }

  @Post('2fa/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete staff login with a TOTP code' })
  async verify2fa(
    @Body(new ZodValidationPipe(verify2faSchema)) body: Verify2faInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.adminAuth.verify2fa(body.challengeToken, body.code, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setAuthCookies(res, tokens, this.secureCookies);
    return tokens;
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin TOTP enrollment (returns secret + otpauth URI)' })
  setup2fa(@CurrentUser() user: AuthenticatedUser) {
    return this.adminAuth.setup2fa(user.userId);
  }

  @Post('2fa/enable')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm the first TOTP code — 2FA becomes mandatory' })
  enable2fa(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(enable2faSchema)) body: Enable2faInput,
  ) {
    return this.adminAuth.enable2fa(user.userId, body.code);
  }

  @Get('me/permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The current staff member’s effective permissions' })
  async myPermissions(@CurrentUser() user: AuthenticatedUser) {
    const ctx = await this.permissions.getStaffContext(user.userId);
    return {
      isStaff: ctx.isStaff,
      isSuperAdmin: ctx.isSuperAdmin,
      permissions: [...ctx.permissions].sort(),
    };
  }
}
