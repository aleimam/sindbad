import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DealStatus, ShipmentType, CredibilityTier, Currency } from '@sindbad/shared';

// Proves the shared package is wired end-to-end across the workspace.
@ApiTags('meta')
@Controller('meta')
export class MetaController {
  @Get('enums')
  enums() {
    return {
      dealStatuses: Object.values(DealStatus),
      shipmentTypes: Object.values(ShipmentType),
      credibilityTiers: Object.values(CredibilityTier),
      currencies: Object.values(Currency),
    };
  }
}
