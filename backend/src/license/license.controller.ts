import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';

interface LicenseFilterConfig {
  id: string;
  name: string;
  category: string;
  type: string;
  min_engine_version: number;
  lut?: string;
  auto?: boolean;
  sticker?: string;
  params?: Record<string, number>;
}

interface LicenseStatusResponse {
  active: boolean;
  filters: string[];
  /**
   * Full server-driven preset definitions for the enabled filters. SDKs build
   * their tray from this, so new filters / tuning changes added in Studio reach
   * installed apps at the next license refresh — no app rebuild.
   */
  filter_configs: LicenseFilterConfig[];
  /** Human-readable note the SDK shows to the host (e.g. account deactivated). */
  message?: string;
}

/**
 * Spec section 9 — no tokens, no signatures. Validity is "what the server says right
 * now"; the SDK re-checks opportunistically and falls back to its cache on failure.
 */
@Controller('v1/license')
export class LicenseController {
  constructor(
    private readonly tenants: TenantsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  async status(
    @Query('client_id') clientId?: string,
    @Query('client_secret') clientSecret?: string,
    @Query('bundle_id') bundleId?: string,
  ): Promise<LicenseStatusResponse> {
    const tenant = await this.tenants.validate(clientId ?? '', clientSecret ?? '', bundleId ?? '');
    if (!tenant) {
      return {
        active: false,
        filters: [],
        filter_configs: [],
        message: 'Wave Lens filters are turned off for this account. Please contact your provider.',
      };
    }

    // A filter reaches a host's tray only when it is both entitled (admin) AND
    // enabled (tenant).
    const entitled = new Set(tenant.entitledFilterIds);
    const filters = tenant.enabledFilterIds.filter((id) => entitled.has(id));

    const rows = await this.prisma.filter.findMany({ where: { id: { in: filters } } });
    const filterConfigs: LicenseFilterConfig[] = rows
      .filter((row) => row.type === 'discrete')
      .map((row) => {
        const config = (row.config ?? {}) as Partial<LicenseFilterConfig>;
        return {
          id: row.id,
          name: row.name,
          category: row.category,
          type: row.type,
          min_engine_version: row.minEngineVersion,
          ...(config.lut !== undefined ? { lut: config.lut } : {}),
          ...(config.auto !== undefined ? { auto: config.auto } : {}),
          ...(config.sticker !== undefined ? { sticker: config.sticker } : {}),
          ...(config.params !== undefined ? { params: config.params } : {}),
        };
      });

    return { active: true, filters, filter_configs: filterConfigs };
  }
}
