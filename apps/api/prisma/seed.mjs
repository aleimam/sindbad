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

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@sindbad.app').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe-2026!';

  for (const name of DEFAULT_TEAMS) {
    await prisma.team.upsert({ where: { name }, create: { name }, update: {} });
  }

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
