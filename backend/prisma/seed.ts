import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

const FILTERS: Array<{ id: string; name: string; category: string; type: string }> = [
  { id: 'brightness', name: 'Brightness', category: 'color', type: 'continuous' },
  { id: 'contrast', name: 'Contrast', category: 'color', type: 'continuous' },
  { id: 'saturation', name: 'Saturation', category: 'color', type: 'continuous' },
  { id: 'temperature', name: 'Warmth', category: 'color', type: 'continuous' },
  { id: 'auto', name: 'Auto', category: 'color', type: 'discrete' },
  { id: 'bw', name: 'B&W', category: 'color', type: 'discrete' },
  { id: 'vintage', name: 'Vintage', category: 'color', type: 'discrete' },
  { id: 'sepia', name: 'Sepia', category: 'color', type: 'discrete' },
  { id: 'warm', name: 'Warm', category: 'color', type: 'discrete' },
  { id: 'cool', name: 'Cool', category: 'color', type: 'discrete' },
  { id: 'glow', name: 'Glow', category: 'color', type: 'discrete' },
  { id: 'film_warm', name: 'Film Warm', category: 'color', type: 'discrete' },
  { id: 'film_cool', name: 'Film Cool', category: 'color', type: 'discrete' },
];

const DEMO_TENANT = {
  name: 'Wave Lens Demo',
  contactEmail: 'dev@wavelens.local',
  bundleId: 'com.wavelens.demo',
  clientId: 'wl_demo_client',
  clientSecret: 'wl_demo_secret',
};

const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@wavelens.online',
  password: process.env.ADMIN_PASSWORD ?? 'WaveLens@Admin2026',
  name: 'Wave Lens Administrator',
};

async function main() {
  for (const filter of FILTERS) {
    await prisma.filter.upsert({
      where: { id: filter.id },
      create: filter,
      update: { name: filter.name, category: filter.category, type: filter.type },
    });
  }

  const secretHash = createHash('sha256').update(DEMO_TENANT.clientSecret).digest('hex');
  const tenant = await prisma.tenant.upsert({
    where: { clientId: DEMO_TENANT.clientId },
    create: {
      name: DEMO_TENANT.name,
      contactEmail: DEMO_TENANT.contactEmail,
      bundleId: DEMO_TENANT.bundleId,
      clientId: DEMO_TENANT.clientId,
      clientSecretHash: secretHash,
      status: 'active',
    },
    update: { status: 'active', clientSecretHash: secretHash },
  });

  for (const filter of FILTERS) {
    await prisma.tenantEntitledFilter.upsert({
      where: { tenantId_filterId: { tenantId: tenant.id, filterId: filter.id } },
      create: { tenantId: tenant.id, filterId: filter.id },
      update: {},
    });
    await prisma.tenantEnabledFilter.upsert({
      where: { tenantId_filterId: { tenantId: tenant.id, filterId: filter.id } },
      create: { tenantId: tenant.id, filterId: filter.id },
      update: {},
    });
  }

  const adminHash = await bcrypt.hash(ADMIN.password, 12);
  await prisma.user.upsert({
    where: { email: ADMIN.email },
    create: {
      email: ADMIN.email,
      passwordHash: adminHash,
      name: ADMIN.name,
      role: UserRole.ADMIN,
      status: 'active',
    },
    update: {
      passwordHash: adminHash,
      name: ADMIN.name,
      role: UserRole.ADMIN,
      status: 'active',
    },
  });

  console.log('Seeded filter catalog (' + FILTERS.length + ' filters) and demo tenant:');
  console.log('  client_id     = ' + DEMO_TENANT.clientId);
  console.log('  client_secret = ' + DEMO_TENANT.clientSecret);
  console.log('  bundle_id     = ' + DEMO_TENANT.bundleId);
  console.log('');
  console.log('Studio admin account:');
  console.log('  email    = ' + ADMIN.email);
  console.log('  password = ' + ADMIN.password + '  (change ADMIN_PASSWORD in env for production)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
