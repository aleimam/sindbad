import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createTripSchema, type CreateTripInput } from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { MissionsService } from './missions.service';
import { MatchingService } from '../matching/matching.service';
import { DealsService } from '../deals/deals.service';
import { FlagsService } from '../deals/flags.service';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(
    private readonly missions: MissionsService,
    private readonly matching: MatchingService,
    private readonly deals: DealsService,
    private readonly flagsService: FlagsService,
    private readonly accounts: AccountsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Browse active trips (public projection — no private fields)' })
  browse() {
    return this.missions.browseTrips();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a trip (goes to admin approval)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTripSchema)) body: CreateTripInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.missions.createTrip(accountId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Trip detail (owners see private fields)' })
  detail(@Param('id') id: string) {
    return this.missions.byId(id);
  }

  @Get(':id/matches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Matching shipments for my trip' })
  async matches(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    const mission = await this.missions.byId(id, accountId);
    if (!mission.isOwner) return [];
    return this.matching.shipmentsForTrip(id);
  }

  @Post(':id/arrived')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Traveler: the trip arrived at the destination' })
  async arrived(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.deals.tripArrived(id, accountId);
  }

  @Post(':id/ready')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Traveler: deals are ready for pickup (bulk, excludes missed)' })
  async ready(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.deals.tripReady(id, accountId);
  }

  @Post(':id/customs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Traveler: abnormal customs paid — flags all deals except traveler-pays-all-customs',
  })
  async customs(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.flagsService.markTripCustoms(id, accountId);
  }
}
