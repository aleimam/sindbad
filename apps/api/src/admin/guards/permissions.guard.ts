import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionKey } from '@sindbad/shared';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PermissionsService } from '../permissions.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/** Runs after JwtAuthGuard. Staff-only; checks @RequirePermissions keys (super admin bypasses). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) throw new ForbiddenException('Not authenticated');

    const ctx = await this.permissions.getStaffContext(user.userId);
    if (!ctx.isStaff) throw new ForbiddenException('Staff only');
    if (!PermissionsService.has(ctx, required))
      throw new ForbiddenException('Missing permission');

    request.staffContext = ctx;
    return true;
  }
}
