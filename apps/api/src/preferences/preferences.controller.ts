import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { categoryPreferencesSchema, type CategoryPreferencesInput } from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('preferences')
export class PreferencesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'My per-category stances (Accept / Reject / Ask)' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.prisma.categoryPreference.findMany({
      where: { accountId },
      select: { categoryId: true, stance: true },
    });
  }

  @Put('categories')
  @ApiOperation({ summary: 'Replace my category preferences' })
  async replace(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(categoryPreferencesSchema)) body: CategoryPreferencesInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    await this.prisma.$transaction([
      this.prisma.categoryPreference.deleteMany({ where: { accountId } }),
      this.prisma.categoryPreference.createMany({
        data: body.items.map((i) => ({
          accountId,
          categoryId: i.categoryId,
          stance: i.stance,
        })),
      }),
    ]);
    return { ok: true, count: body.items.length };
  }
}
