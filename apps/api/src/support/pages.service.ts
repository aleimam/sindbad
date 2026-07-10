import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Static pages CMS (spec Static Pages) — per-language, publishable. */
@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublished() {
    return this.prisma.staticPage.findMany({
      where: { published: true },
      select: { slug: true, titleEn: true, titleAr: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async bySlug(slug: string) {
    const page = await this.prisma.staticPage.findUnique({ where: { slug } });
    if (!page || !page.published) throw new NotFoundException('Page not found');
    return page;
  }

  // ── Admin CRUD ──

  listAll() {
    return this.prisma.staticPage.findMany({ orderBy: { createdAt: 'asc' } });
  }

  create(input: {
    slug: string;
    titleEn: string;
    titleAr: string;
    bodyEn: string;
    bodyAr: string;
    published: boolean;
  }) {
    return this.prisma.staticPage.create({ data: input });
  }

  async update(id: string, input: Partial<{ titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; published: boolean }>) {
    const page = await this.prisma.staticPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    return this.prisma.staticPage.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    const page = await this.prisma.staticPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    if (page.systemPage) throw new BadRequestException('Core pages cannot be deleted (unpublish instead)');
    await this.prisma.staticPage.delete({ where: { id } });
    return { ok: true };
  }
}
