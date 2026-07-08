import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('countries')
  @ApiOperation({ summary: 'Active countries (per-language names)' })
  countries() {
    return this.prisma.country.findMany({
      where: { active: true },
      select: { id: true, code: true, nameEn: true, nameAr: true },
      orderBy: { nameEn: 'asc' },
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Active categories, grouped' })
  categories() {
    return this.prisma.category.findMany({
      where: { active: true },
      select: { id: true, nameEn: true, nameAr: true, groupEn: true, groupAr: true },
      orderBy: [{ groupEn: 'asc' }, { nameEn: 'asc' }],
    });
  }
}
