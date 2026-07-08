import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createShipmentSchema, type CreateShipmentInput } from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { MissionsService } from './missions.service';
import { MatchingService } from '../matching/matching.service';

@ApiTags('shipments')
@Controller('shipments')
export class ShipmentsController {
  constructor(
    private readonly missions: MissionsService,
    private readonly matching: MatchingService,
    private readonly accounts: AccountsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Browse active shipments' })
  browse() {
    return this.missions.browseShipments();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a shipment (live immediately, no approval)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createShipmentSchema)) body: CreateShipmentInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.missions.createShipment(accountId, body);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'All my missions (trips + shipments)' })
  async mine(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.missions.mine(accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Shipment detail' })
  detail(@Param('id') id: string) {
    return this.missions.byId(id);
  }

  @Get(':id/matches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Matching trips for my shipment' })
  async matches(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    const mission = await this.missions.byId(id, accountId);
    if (!mission.isOwner) return [];
    return this.matching.tripsForShipment(id);
  }
}
