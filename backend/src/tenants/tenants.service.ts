import { Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface ValidatedTenant {
  id: number;
  name: string;
  entitledFilterIds: string[];
  enabledFilterIds: string[];
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  static hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Validates client_id + client_secret + bundle_id and returns the tenant with its
   * filter lists, or null when anything doesn't match or the tenant is inactive.
   * Deliberately returns null (not distinct errors) so the endpoint response never
   * leaks whether a client_id exists — per spec, invalid == { active: false }.
   */
  async validate(
    clientId: string,
    clientSecret: string,
    bundleId: string,
  ): Promise<ValidatedTenant | null> {
    if (!clientId || !clientSecret || !bundleId) return null;

    const tenant = await this.prisma.tenant.findUnique({
      where: { clientId },
      include: { entitled: true, enabled: true },
    });
    if (!tenant) return null;
    if (tenant.status !== 'active') return null;
    if (tenant.bundleId !== bundleId) return null;

    const givenHash = Buffer.from(TenantsService.hashSecret(clientSecret), 'hex');
    const storedHash = Buffer.from(tenant.clientSecretHash, 'hex');
    if (givenHash.length !== storedHash.length || !timingSafeEqual(givenHash, storedHash)) {
      return null;
    }

    return {
      id: tenant.id,
      name: tenant.name,
      entitledFilterIds: tenant.entitled.map((e) => e.filterId),
      enabledFilterIds: tenant.enabled.map((e) => e.filterId),
    };
  }
}
