import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.service';

@Injectable()
export class StudioService {
  constructor(private readonly prisma: PrismaService) {}

  private tenantIdFor(user: AuthUser): number {
    if (user.role === 'ADMIN' && !user.tenantId) {
      throw new ForbiddenException('Admin users should use the admin panel');
    }
    if (!user.tenantId) throw new ForbiddenException('No tenant linked to this account');
    return user.tenantId;
  }

  async getOverview(user: AuthUser) {
    const tenantId = this.tenantIdFor(user);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        entitled: { include: { filter: true } },
        enabled: { include: { filter: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        contactEmail: tenant.contactEmail,
        bundleId: tenant.bundleId,
        clientId: tenant.clientId,
        status: tenant.status,
        createdAt: tenant.createdAt,
      },
      filters: {
        entitled: tenant.entitled.map((e) => ({
          id: e.filter.id,
          name: e.filter.name,
          category: e.filter.category,
          type: e.filter.type,
        })),
        enabledIds: tenant.enabled.map((e) => e.filterId),
      },
    };
  }

  async setEnabledFilters(user: AuthUser, filterIds: string[]) {
    const tenantId = this.tenantIdFor(user);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { entitled: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.status !== 'active') throw new ForbiddenException('Tenant is inactive');

    const entitledSet = new Set(tenant.entitled.map((e) => e.filterId));
    const unique = [...new Set(filterIds)];
    for (const id of unique) {
      if (!entitledSet.has(id)) {
        throw new BadRequestException(`Filter "${id}" is not entitled for this tenant`);
      }
    }

    await this.prisma.$transaction([
      this.prisma.tenantEnabledFilter.deleteMany({ where: { tenantId } }),
      ...(unique.length
        ? [
            this.prisma.tenantEnabledFilter.createMany({
              data: unique.map((filterId) => ({ tenantId, filterId })),
            }),
          ]
        : []),
    ]);

    return { enabledIds: unique };
  }
}
