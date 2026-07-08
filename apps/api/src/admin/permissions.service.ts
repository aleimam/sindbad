import { Injectable } from '@nestjs/common';
import type { PermissionKey } from '@sindbad/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface StaffContext {
  isStaff: boolean;
  isSuperAdmin: boolean;
  permissions: Set<string>;
}

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Effective permissions = union(team grants) + member allow-grants − member denials. */
  async getStaffContext(userId: string): Promise<StaffContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isStaff: true,
        isSuperAdmin: true,
        staffPermissions: { select: { permission: true, allow: true } },
        teamMemberships: {
          select: { team: { select: { permissions: { select: { permission: true } } } } },
        },
      },
    });
    if (!user) return { isStaff: false, isSuperAdmin: false, permissions: new Set() };

    return {
      isStaff: user.isStaff,
      isSuperAdmin: user.isSuperAdmin,
      permissions: PermissionsService.resolve(
        user.teamMemberships.flatMap((m) => m.team.permissions.map((p) => p.permission)),
        user.staffPermissions,
      ),
    };
  }

  static resolve(
    teamPermissions: string[],
    overrides: Array<{ permission: string; allow: boolean }>,
  ): Set<string> {
    const effective = new Set(teamPermissions);
    for (const o of overrides) {
      if (o.allow) effective.add(o.permission);
      else effective.delete(o.permission);
    }
    return effective;
  }

  static has(ctx: StaffContext, required: PermissionKey[]): boolean {
    if (!ctx.isStaff) return false;
    if (ctx.isSuperAdmin) return true;
    return required.every((p) => ctx.permissions.has(p));
  }
}
