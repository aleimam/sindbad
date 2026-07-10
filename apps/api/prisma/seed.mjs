// Seeds the first super admin and the default staff teams.
// Runs via `pnpm --filter @sindbad/api exec prisma db seed` once the database exists.
// Configure with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars.
import { PrismaClient } from '@prisma/client';
import { hash, Algorithm } from '@node-rs/argon2';

const prisma = new PrismaClient();

const DEFAULT_TEAMS = [
  'Support',
  'Verification',
  'Finance & Payouts',
  'Disputes',
  'Content',
  'Super Admin',
];

// Initial launch countries (admin-editable). priceParam feeds the fee engine's C multiplier.
const COUNTRIES = [
  ['EG', 'Egypt', 'مصر', 1.0],
  ['US', 'United States', 'الولايات المتحدة', 1.2],
  ['GB', 'United Kingdom', 'المملكة المتحدة', 1.15],
  ['DE', 'Germany', 'ألمانيا', 1.1],
  ['FR', 'France', 'فرنسا', 1.1],
  ['IT', 'Italy', 'إيطاليا', 1.1],
  ['ES', 'Spain', 'إسبانيا', 1.05],
  ['AE', 'United Arab Emirates', 'الإمارات', 1.05],
  ['SA', 'Saudi Arabia', 'السعودية', 1.05],
  ['KW', 'Kuwait', 'الكويت', 1.05],
  ['QA', 'Qatar', 'قطر', 1.05],
  ['TR', 'Turkey', 'تركيا', 1.0],
  ['CA', 'Canada', 'كندا', 1.2],
  ['IE', 'Ireland', 'أيرلندا', 1.1],
  ['NL', 'Netherlands', 'هولندا', 1.1],
];

// Initial category list (spec: "create initial list of all categories of products that can be
// shopped from abroad and carried on air trips" — admin-editable, grouped, T multiplier per row).
const CATEGORIES = [
  // [nameEn, nameAr, groupEn, groupAr, T]
  ['Mobile phones', 'هواتف محمولة', 'Electronics', 'إلكترونيات', 1.6],
  ['Laptops & tablets', 'لابتوب وأجهزة لوحية', 'Electronics', 'إلكترونيات', 1.6],
  ['Accessories & chargers', 'إكسسوارات وشواحن', 'Electronics', 'إلكترونيات', 1.2],
  ['Cameras & drones', 'كاميرات وطائرات مسيرة', 'Electronics', 'إلكترونيات', 1.6],
  ['Gaming consoles & games', 'أجهزة وألعاب فيديو', 'Electronics', 'إلكترونيات', 1.5],
  ['Smart watches & wearables', 'ساعات ذكية', 'Electronics', 'إلكترونيات', 1.4],
  ['Clothing', 'ملابس', 'Fashion', 'أزياء', 1.0],
  ['Shoes', 'أحذية', 'Fashion', 'أزياء', 1.0],
  ['Bags & luggage', 'حقائب', 'Fashion', 'أزياء', 1.0],
  ['Watches & jewelry', 'ساعات ومجوهرات', 'Fashion', 'أزياء', 1.8],
  ['Sunglasses & eyewear', 'نظارات', 'Fashion', 'أزياء', 1.2],
  ['Skincare & cosmetics', 'عناية بالبشرة ومستحضرات تجميل', 'Beauty & Health', 'جمال وصحة', 1.2],
  ['Perfumes', 'عطور', 'Beauty & Health', 'جمال وصحة', 1.3],
  ['Vitamins & supplements', 'فيتامينات ومكملات', 'Beauty & Health', 'جمال وصحة', 1.2],
  ['Personal care devices', 'أجهزة عناية شخصية', 'Beauty & Health', 'جمال وصحة', 1.2],
  ['Baby care & formula', 'مستلزمات أطفال وحليب', 'Family', 'عائلة', 1.1],
  ['Toys', 'ألعاب أطفال', 'Family', 'عائلة', 1.0],
  ['Books & stationery', 'كتب وقرطاسية', 'Home & Hobbies', 'منزل وهوايات', 0.9],
  ['Small home appliances', 'أجهزة منزلية صغيرة', 'Home & Hobbies', 'منزل وهوايات', 1.2],
  ['Kitchenware', 'أدوات مطبخ', 'Home & Hobbies', 'منزل وهوايات', 1.0],
  ['Sports & fitness gear', 'مستلزمات رياضية', 'Home & Hobbies', 'منزل وهوايات', 1.1],
  ['Tools & hardware', 'عدد وأدوات', 'Home & Hobbies', 'منزل وهوايات', 1.1],
  ['Auto parts & accessories', 'قطع غيار سيارات', 'Specialty', 'متخصص', 1.3],
  ['Packaged food & sweets', 'أغذية معلبة وحلويات', 'Specialty', 'متخصص', 1.0],
  ['Coffee & tea', 'قهوة وشاي', 'Specialty', 'متخصص', 1.0],
  ['Musical instruments', 'آلات موسيقية', 'Specialty', 'متخصص', 1.3],
  ['Pet supplies', 'مستلزمات حيوانات أليفة', 'Specialty', 'متخصص', 1.0],
  ['Medical devices (OTC)', 'أجهزة طبية منزلية', 'Specialty', 'متخصص', 1.4],
];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@sindbad.app').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe-2026!';

  for (const name of DEFAULT_TEAMS) {
    await prisma.team.upsert({ where: { name }, create: { name }, update: {} });
  }

  for (const [code, nameEn, nameAr, priceParam] of COUNTRIES) {
    await prisma.country.upsert({
      where: { code },
      create: { code, nameEn, nameAr, priceParam },
      update: {},
    });
  }
  console.log(`Seeded ${COUNTRIES.length} countries.`);

  // Verifiable details (spec "Verification") — prices/points/durations admin-editable.
  const VERIFICATION_TYPES = [
    // [key, nameEn, nameAr, priceUsd(minor), points, days]
    ['FULL_NAME', 'Full name', 'الاسم الكامل', 200, 10, 2],
    ['PHONE', 'Phone number', 'رقم الهاتف', 0, 5, 1],
    ['EMAIL', 'Email', 'البريد الإلكتروني', 0, 3, 1],
    ['NATIONAL_ID', 'National ID', 'الرقم القومي', 300, 15, 3],
    ['PHOTO_LIVENESS', 'Live photo vs ID', 'صورة حية مطابقة للهوية', 300, 15, 3],
    ['PASSPORT', 'Passport', 'جواز السفر', 300, 15, 3],
    ['LOCAL_ADDRESS', 'Local address', 'العنوان المحلي', 200, 8, 5],
    ['ABROAD_ADDRESS', 'Abroad address', 'العنوان بالخارج', 200, 8, 5],
    ['FACEBOOK', 'Facebook account', 'حساب فيسبوك', 100, 4, 2],
    ['INSTAGRAM', 'Instagram account', 'حساب إنستغرام', 100, 4, 2],
  ];
  for (const [key, nameEn, nameAr, priceUsd, credibilityPoints, durationDays] of VERIFICATION_TYPES) {
    await prisma.verificationType.upsert({
      where: { key },
      create: { key, nameEn, nameAr, priceUsd, credibilityPoints, durationDays },
      update: {},
    });
  }
  console.log(`Seeded ${VERIFICATION_TYPES.length} verification types.`);

  await prisma.feeConfig.upsert({
    where: { id: 'GLOBAL' },
    create: { id: 'GLOBAL', basketMultiplier: 1.3, weightUsdPerKg: 300, floorFeeUsd: 500 },
    update: {},
  });
  console.log('Seeded fee config (B=1.3, W=$3/kg, F=$5).');

  const existingCategories = await prisma.category.count();
  if (existingCategories === 0) {
    await prisma.category.createMany({
      data: CATEGORIES.map(([nameEn, nameAr, groupEn, groupAr, typeMultiplier]) => ({
        nameEn,
        nameAr,
        groupEn,
        groupAr,
        typeMultiplier,
      })),
    });
    console.log(`Seeded ${CATEGORIES.length} categories.`);
  }

  // Core static pages (spec Static Pages) — seeded as systemPage so they can be
  // edited/unpublished but never deleted. Bodies are Markdown placeholders.
  const STATIC_PAGES = [
    ['terms', 'Terms of Service', 'شروط الخدمة'],
    ['privacy', 'Privacy Policy', 'سياسة الخصوصية'],
    ['about', 'About Sindbad', 'عن سندباد'],
    ['contact', 'Contact Us', 'اتصل بنا'],
    ['guide', 'How Sindbad Works', 'كيف يعمل سندباد'],
    ['faq', 'Frequently Asked Questions', 'الأسئلة الشائعة'],
  ];
  for (const [slug, titleEn, titleAr] of STATIC_PAGES) {
    await prisma.staticPage.upsert({
      where: { slug },
      create: {
        slug,
        titleEn,
        titleAr,
        bodyEn: `# ${titleEn}\n\n_Content coming soon._`,
        bodyAr: `# ${titleAr}\n\n_المحتوى قريباً._`,
        published: false,
        systemPage: true,
      },
      update: {},
    });
  }
  console.log(`Seeded ${STATIC_PAGES.length} static pages (unpublished).`);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super admin already exists: ${email}`);
    return;
  }

  const passwordHash = await hash(password, { algorithm: Algorithm.Argon2id });
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerifiedAt: new Date(),
      isStaff: true,
      isSuperAdmin: true,
    },
  });
  const superTeam = await prisma.team.findUnique({ where: { name: 'Super Admin' } });
  if (superTeam) {
    await prisma.teamMember.create({ data: { userId: admin.id, teamId: superTeam.id } });
  }
  console.log(`Created super admin ${email} (id ${admin.id}).`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn('WARNING: default password used — change it immediately.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
