// Push the canonical static-page content (pages-content.mjs) into an existing
// database — updating title/body and publish state for all six pages.
//
// Run inside the API container (it has @prisma/client + DATABASE_URL):
//   docker compose -f docker-compose.prod.yml exec -T api node prisma/apply-pages.mjs
//
// This intentionally OVERWRITES page content and publish flags, so run it only
// when you mean to (re)apply the canonical copy. Terms & Privacy stay unpublished
// (publish: false) until a lawyer signs off — publish them from the admin CMS.
import { PrismaClient } from '@prisma/client';
import { STATIC_PAGES } from './pages-content.mjs';

const prisma = new PrismaClient();

async function main() {
  let published = 0;
  for (const p of STATIC_PAGES) {
    const data = {
      titleEn: p.titleEn,
      titleAr: p.titleAr,
      bodyEn: p.bodyEn,
      bodyAr: p.bodyAr,
      published: p.publish,
    };
    await prisma.staticPage.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, systemPage: true, ...data },
      update: data,
    });
    if (p.publish) published += 1;
    console.log(`${p.publish ? 'PUBLISHED' : 'draft    '}  /${p.slug}`);
  }
  console.log(`\nApplied ${STATIC_PAGES.length} pages — ${published} published, ${STATIC_PAGES.length - published} kept as drafts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
