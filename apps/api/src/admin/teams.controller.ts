import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  staffPermissionsSchema,
  teamMemberSchema,
  teamPermissionsSchema,
  teamUpsertSchema,
  type StaffPermissionsInput,
  type TeamMemberInput,
  type TeamPermissionsInput,
  type TeamUpsertInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { TeamsService } from './teams.service';

@ApiTags('admin/teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get('teams')
  @RequirePermissions('teams.manage')
  list() {
    return this.teams.listTeams();
  }

  @Post('teams')
  @RequirePermissions('teams.manage')
  create(@Body(new ZodValidationPipe(teamUpsertSchema)) body: TeamUpsertInput) {
    return this.teams.createTeam(body.name);
  }

  @Patch('teams/:id')
  @RequirePermissions('teams.manage')
  rename(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(teamUpsertSchema)) body: TeamUpsertInput,
  ) {
    return this.teams.renameTeam(id, body.name);
  }

  @Delete('teams/:id')
  @RequirePermissions('teams.manage')
  remove(@Param('id') id: string) {
    return this.teams.deleteTeam(id);
  }

  @Put('teams/:id/permissions')
  @RequirePermissions('permissions.manage')
  setPermissions(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(teamPermissionsSchema)) body: TeamPermissionsInput,
  ) {
    return this.teams.setTeamPermissions(id, body.permissions);
  }

  @Post('teams/:id/members')
  @RequirePermissions('staff.manage')
  addMember(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(teamMemberSchema)) body: TeamMemberInput,
  ) {
    return this.teams.addMember(id, body.userId);
  }

  @Delete('teams/:id/members/:userId')
  @RequirePermissions('staff.manage')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.teams.removeMember(id, userId);
  }

  @Get('staff')
  @RequirePermissions('staff.manage')
  staff() {
    return this.teams.listStaff();
  }

  @Put('staff/:userId/permissions')
  @RequirePermissions('permissions.manage')
  setStaffPermissions(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(staffPermissionsSchema)) body: StaffPermissionsInput,
  ) {
    return this.teams.setStaffPermissions(userId, body.grants);
  }
}
