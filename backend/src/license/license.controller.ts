import { Controller, Get, Query } from '@nestjs/common';
import { TenantsService } from '../tenants/tenants.service';

interface LicenseStatusResponse {
  active: boolean;
  filters: string[];
}

/**
 * Spec section 9 — no tokens, no signatures. Validity is "what the server says right
 * now"; the SDK re-checks opportunistically and falls back to its cache on failure.
 */
@Controller('v1/license')
export class LicenseController {
  constructor(private readonly tenants: TenantsService) {}

  @Get('status')
  async status(
    @Query('client_id') clientId?: string,
    @Query('client_secret') clientSecret?: string,
    @Query('bundle_id') bundleId?: string,
  ): Promise<LicenseStatusResponse> {
    const tenant = await this.tenants.validate(clientId ?? '', clientSecret ?? '', bundleId ?? '');
    if (!tenant) {
      return { active: false, filters: [] };
    }

    // A filter reaches a host's tray only when it is both entitled (admin) AND
    // enabled (tenant).
    const entitled = new Set(tenant.entitledFilterIds);
    const filters = tenant.enabledFilterIds.filter((id) => entitled.has(id));
    return { active: true, filters };
  }
}
