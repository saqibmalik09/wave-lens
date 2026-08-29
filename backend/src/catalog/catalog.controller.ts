import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';

interface CatalogFilter {
  id: string;
  name: string;
  category: string;
  type: string;
  assetUrl: string | null;
  minEngineVersion: number;
}

/**
 * Filter metadata + asset references, fetched on demand when the SDK's tray needs a
 * category that isn't cached yet. Requires valid tenant credentials; only filters the
 * tenant is entitled to are returned.
 */
@Controller('v1/catalog')
export class CatalogController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  @Get('filters')
  async filters(
    @Query('client_id') clientId?: string,
    @Query('client_secret') clientSecret?: string,
    @Query('bundle_id') bundleId?: string,
    @Query('category') category?: string,
  ): Promise<{ filters: CatalogFilter[] }> {
    const tenant = await this.tenants.validate(clientId ?? '', clientSecret ?? '', bundleId ?? '');
    if (!tenant) {
      return { filters: [] };
    }

    const rows = await this.prisma.filter.findMany({
      where: {
        id: { in: tenant.entitledFilterIds },
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return {
      filters: rows.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category,
        type: f.type,
        assetUrl: f.assetRef,
        minEngineVersion: f.minEngineVersion,
      })),
    };
  }
}
