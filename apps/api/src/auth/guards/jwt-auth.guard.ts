import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../token.service';
import { ACCESS_COOKIE } from '../cookies';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extract(request);
    if (!token) throw new UnauthorizedException('Missing access token');
    try {
      const payload = this.tokens.verifyAccessToken(token);
      (request as Request & { user: unknown }).user = {
        userId: payload.sub,
        sessionId: payload.sid,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extract(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.[ACCESS_COOKIE];
  }
}
