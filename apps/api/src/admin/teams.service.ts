import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isPermissionKey } from '@sindbad/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  listTeams() {
    return this.prisma.team.findMany({
      include: {
        permissions: { select: { permission: true } },
        members: {
          select: {
            user: { select: { id: true, email: true, phone: true, isSuperAdmin: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  createTeam(name: string) {
    return this.prisma.team.create({ data: { name } });
  }

  async renameTeam(id: string, name: string) {
    await this.ensureTeam(id);
    return this.prisma.team.update({ where: { id }, data: { name } });
  }

  async deleteTeam(id: string) {
    await this.ensureTeam(id);
    await this.prisma.team.delete({ where: { id } });
    return { ok: true };
  }

  /** Replace the team's permission set. */
  async setTeamPermissions(id: string, permissions: string[]) {
    await this.ensureTeam(id);
    const invalid = permissions.filter((p) => !isPermissionKey(p));
    if (invalid.length) throw new BadRequestException(`Unknown permissions: ${invalid.join(', ')}`);

    await this.prisma.$transaction([
      this.prisma.teamPermission.deleteMany({ where: { teamId: id } }),
      this.prisma.teamPermission.createMany({
        data: permissions.map((permission) => ({ teamId: id, permission })),
      }),
    ]);
    return { ok: true, permissions };
  }

  /** Adding someone to a team makes them staff. */
  async addMember(teamId: string, userId: string) {
    await this.ensureTeam(teamId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.teamMember.upsert({
        where: { userId_teamId: { userId, teamId } },
        create: { userId, teamId },
        update: {},
      }),
      this.prisma.user.update({ where: { id: userId }, data: { isStaff: true } }),
    ]);
    return { ok: true };
  }

  async removeMember(teamId: string, userId: string) {
    await this.prisma.teamMember.deleteMany({ where: { teamId, userId } });
    return { ok: true };
  }

  listStaff() {
    return this.prisma.user.findMany({
      where: { isStaff: true },
      select: {
        id: true,
        email: true,
        phone: true,
        isSuperAdmin: true,
        totpEnabledAt: true,
        teamMemberships: { select: { team: { select: { id: true, name: true } } } },
        staffPermissions: { select: { permission: true, allow: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Replace a staff member's per-member overrides. */
  async setStaffPermissions(userId: string, grants: Array<{ permission: string; allow: boolean }>) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const invalid = grants.filter((g) => !isPermissionKey(g.permission));
    if (invalid.length)
      throw new BadRequestException(
        `Unknown permissions: ${invalid.map((g) => g.permission).join(', ')}`,
      );

    await this.prisma.$transaction([
      this.prisma.staffPermission.deleteMany({ where: { userId } }),
      this.prisma.staffPermission.createMany({
        data: grants.map((g) => ({ userId, permission: g.permission, allow: g.allow })),
      }),
    ]);
    return { ok: true };
  }

  private async ensureTeam(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }
}
