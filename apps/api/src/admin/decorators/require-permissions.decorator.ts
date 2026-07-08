import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@sindbad/shared';

export const PERMISSIONS_KEY = 'required_permissions';

/** Gate a route on staff permissions: @RequirePermissions('teams.manage') */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
