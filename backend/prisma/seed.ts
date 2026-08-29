import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

/**
 * `config` is the server-driven preset definition delivered to installed SDKs on
 * every license refresh. Editing values here (or adding new rows with a config)
 * updates live apps WITHOUT an app rebuild:
 *   { lut?: string, auto?: boolean, sticker?: string,
 *     params?: { brightness|contrast|saturation|temperature|tint|vignette|glow|
 *                lut_intensity|smoothing|sharpen|face_deform: number } }
 */
const FILTERS: Array<{
  id: string;
  name: string;
  category: string;
  type: string;
  minEngineVersion?: number;
  config?: Record<string, unknown>;
}> = [
  // Auto — live camera analysis (exposure / contrast / white balance)
  {
    id: 'auto', name: 'Auto', category: 'auto', type: 'discrete',
    config: { auto: true, params: { sharpen: 0.3 } },
  },

  // Beauty — skin smoothing looks
  {
    id: 'beauty_smooth', name: 'Smooth', category: 'beauty', type: 'discrete',
    config: { params: { smoothing: 0.85, brightness: 0.08, saturation: 0.1 } },
  },
  {
    id: 'beauty_natural', name: 'Natural', category: 'beauty', type: 'discrete',
    config: { auto: true, params: { smoothing: 0.55, saturation: 0.13, sharpen: 0.2 } },
  },
  {
    id: 'beauty_fair', name: 'Fair', category: 'beauty', type: 'discrete',
    config: { params: { smoothing: 0.75, brightness: 0.18, temperature: -0.1, contrast: -0.06 } },
  },
  {
    id: 'beauty_rosy', name: 'Rosy', category: 'beauty', type: 'discrete',
    config: {
      params: { smoothing: 0.7, brightness: 0.09, temperature: 0.2, tint: -0.28, saturation: 0.16 },
    },
  },
  {
    id: 'beauty_glam', name: 'Glam', category: 'beauty', type: 'discrete',
    config: {
      params: { smoothing: 0.8, glow: 0.55, brightness: 0.08, saturation: 0.2, vignette: 0.3 },
    },
  },
  { id: 'smoothing', name: 'Skin Smoothing', category: 'beauty', type: 'continuous' },

  // Enhance — video quality rescue for weak cameras
  {
    id: 'enhance', name: 'HD Boost', category: 'enhance', type: 'discrete',
    config: { auto: true, params: { sharpen: 0.8, contrast: 0.15, saturation: 0.23, smoothing: 0.12 } },
  },
  { id: 'sharpen', name: 'Sharpen', category: 'enhance', type: 'continuous' },

  // Effects — color looks & sliders
  { id: 'brightness', name: 'Brightness', category: 'effects', type: 'continuous' },
  { id: 'contrast', name: 'Contrast', category: 'effects', type: 'continuous' },
  { id: 'saturation', name: 'Saturation', category: 'effects', type: 'continuous' },
  { id: 'temperature', name: 'Warmth', category: 'effects', type: 'continuous' },
  {
    id: 'bw', name: 'B&W', category: 'effects', type: 'discrete',
    config: { lut: 'bw', params: { lut_intensity: 1, contrast: 0.13 } },
  },
  {
    id: 'vintage', name: 'Vintage', category: 'effects', type: 'discrete',
    config: { lut: 'vintage', params: { lut_intensity: 1, vignette: 0.6 } },
  },
  {
    id: 'sepia', name: 'Sepia', category: 'effects', type: 'discrete',
    config: { lut: 'sepia', params: { lut_intensity: 1, vignette: 0.26 } },
  },
  {
    id: 'warm', name: 'Warm', category: 'effects', type: 'discrete',
    config: { params: { temperature: 0.7, saturation: 0.2, brightness: 0.05 } },
  },
  {
    id: 'cool', name: 'Cool', category: 'effects', type: 'discrete',
    config: { params: { temperature: -0.7, saturation: 0.13 } },
  },
  {
    id: 'glow', name: 'Glow', category: 'effects', type: 'discrete',
    config: { params: { glow: 1.0, brightness: 0.1, saturation: 0.13 } },
  },
  {
    id: 'film_warm', name: 'Film Warm', category: 'effects', type: 'discrete',
    config: { lut: 'film_warm', params: { lut_intensity: 1 } },
  },
  {
    id: 'film_cool', name: 'Film Cool', category: 'effects', type: 'discrete',
    config: { lut: 'film_cool', params: { lut_intensity: 1 } },
  },

  // Face — Face-Anchored 2D AR (live in SDK engine v2: ML Kit runtime face tracking).
  // Effects render only while a face is detected; older SDKs ignore unknown ids.
  {
    id: 'sunglasses', name: 'Chasma', category: 'face', type: 'discrete',
    minEngineVersion: 2, config: { sticker: 'sunglasses' },
  },
  {
    id: 'heart_glasses', name: 'Heart Glasses', category: 'face', type: 'discrete',
    minEngineVersion: 2, config: { sticker: 'heart_glasses' },
  },
  {
    id: 'cat_ears', name: 'Cat Ears', category: 'face', type: 'discrete',
    minEngineVersion: 2, config: { sticker: 'cat_ears' },
  },
  {
    id: 'face_warp', name: 'Funny Face', category: 'face', type: 'discrete',
    minEngineVersion: 2, config: { params: { face_deform: 0.6 } },
  },
  // Coming next in the sticker pack (configs reference stickers newer SDKs will have):
  {
    id: 'bunny_ears', name: 'Bunny Ears', category: 'face', type: 'discrete',
    minEngineVersion: 3, config: { sticker: 'bunny_ears' },
  },
  {
    id: 'dog_ears', name: 'Dog Ears', category: 'face', type: 'discrete',
    minEngineVersion: 3, config: { sticker: 'dog_ears' },
  },
  {
    id: 'crown', name: 'Crown', category: 'face', type: 'discrete',
    minEngineVersion: 3, config: { sticker: 'crown' },
  },
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
    const data = {
      name: filter.name,
      category: filter.category,
      type: filter.type,
      minEngineVersion: filter.minEngineVersion ?? 1,
      config: (filter.config ?? undefined) as object | undefined,
    };
    await prisma.filter.upsert({
      where: { id: filter.id },
      create: { id: filter.id, ...data },
      update: data,
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
