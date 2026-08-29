import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Phase 1 catalog: color effects only. Ids match FilterPreset ids /
// engine LUT names on the SDK side. Masks/backgrounds arrive in Phase 3/4.
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

  // Demo tenant is entitled to and has enabled the full color catalog.
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

  console.log('Seeded filter catalog (' + FILTERS.length + ' filters) and demo tenant:');
  console.log('  client_id     = ' + DEMO_TENANT.clientId);
  console.log('  client_secret = ' + DEMO_TENANT.clientSecret + '  (store safely — hash only in DB)');
  console.log('  bundle_id     = ' + DEMO_TENANT.bundleId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
