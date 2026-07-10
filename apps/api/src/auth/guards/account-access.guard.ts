import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { isHeld, isRestrictedPathAllowed } from '../../support/moderation';
import { TokenService } from '../token.service';
import { ACCESS_COOKIE } from '../cookies';

/**
 * Global gate enforcing moderation states (spec Blocked Users):
 *  • BLOCKED accounts and accounts under an active membership hold keep
 *    "ongoing-deals-only" access — they may finish in-flight deals, chat about
 *    them, and read notifications, but cannot start new marketplace activity.
 *
 * Runs independently of {@link JwtAuthGuard} (parses the token itself) so it
 * works as a global guard regardless of per-controller guard ordering. It is a
 * no-op for unauthenticated / public routes.
 */
@Injectable()
export class AccountAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extract(request);
    if (!token) return true; // public / unauthenticated — nothing to restrict

    let userId: string;
    try {
      userId = this.tokens.verifyAccessToken(token).sub;
    } catch {
      return true; // let JwtAuthGuard produce the canonical 401
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, holdUntil: true },
    });
    if (!user) return true;

    const restricted = user.status === 'BLOCKED' || isHeld(user.holdUntil, new Date());
    if (!restricted) return true;
    if (isRestrictedPathAllowed(request.path)) return true;

    throw new ForbiddenException(
      user.status === 'BLOCKED'
        ? 'Your account is blocked. Only ongoing deals remain accessible.'
        : 'Your account is temporarily suspended. Only ongoing deals remain accessible.',
    );
  }

  private extract(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.[ACCESS_COOKIE];
  }
}
