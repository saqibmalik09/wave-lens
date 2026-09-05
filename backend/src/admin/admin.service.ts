import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { entitled: true, enabled: true, users: true } },
      },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      contactEmail: t.contactEmail,
      bundleId: t.bundleId,
      clientId: t.clientId,
      status: t.status,
      createdAt: t.createdAt,
      entitledCount: t._count.entitled,
      enabledCount: t._count.enabled,
      userCount: t._count.users,
    }));
  }

  async getTenant(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        entitled: { include: { filter: true } },
        enabled: true,
        users: { select: { id: true, email: true, name: true, status: true, createdAt: true } },
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
      users: tenant.users,
      entitledFilterIds: tenant.entitled.map((e) => e.filterId),
      enabledFilterIds: tenant.enabled.map((e) => e.filterId),
      filters: tenant.entitled.map((e) => ({
        id: e.filter.id,
        name: e.filter.name,
        category: e.filter.category,
        type: e.filter.type,
      })),
    };
  }

  async updateTenantStatus(id: number, status: 'active' | 'inactive') {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status },
    });
    return { id: tenant.id, status: tenant.status };
  }

  async setEntitledFilters(id: number, filterIds: string[]) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { enabled: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const filters = await this.prisma.filter.findMany({ where: { id: { in: filterIds } } });
    if (filters.length !== filterIds.length) {
      throw new BadRequestException('One or more filter IDs are invalid');
    }

    const entitledSet = new Set(filterIds);
    const enabledToRemove = tenant.enabled.filter((e) => !entitledSet.has(e.filterId));

    await this.prisma.$transaction([
      this.prisma.tenantEntitledFilter.deleteMany({ where: { tenantId: id } }),
      this.prisma.tenantEntitledFilter.createMany({
        data: filterIds.map((filterId) => ({ tenantId: id, filterId })),
      }),
      ...(enabledToRemove.length
        ? [
            this.prisma.tenantEnabledFilter.deleteMany({
              where: {
                tenantId: id,
                filterId: { in: enabledToRemove.map((e) => e.filterId) },
              },
            }),
          ]
        : []),
    ]);

    return { entitledFilterIds: filterIds };
  }

  async regenerateSecret(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const clientSecret = randomBytes(24).toString('base64url');
    await this.prisma.tenant.update({
      where: { id },
      data: { clientSecretHash: TenantsService.hashSecret(clientSecret) },
    });

    return { clientId: tenant.clientId, clientSecret, bundleId: tenant.bundleId };
  }

  async updateTenantDetails(
    id: number,
    input: { name?: string; contactEmail?: string; bundleId?: string },
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const data: { name?: string; contactEmail?: string; bundleId?: string } = {};
    if (typeof input.name === 'string' && input.name.trim()) {
      data.name = input.name.trim();
    }
    if (typeof input.contactEmail === 'string' && input.contactEmail.trim()) {
      data.contactEmail = input.contactEmail.trim().toLowerCase();
    }
    if (typeof input.bundleId === 'string' && input.bundleId.trim()) {
      const bundleId = input.bundleId.trim();
      if (bundleId !== tenant.bundleId) {
        const clash = await this.prisma.tenant.findFirst({
          where: { bundleId, NOT: { id } },
        });
        if (clash) {
          throw new BadRequestException('This package / bundle ID is already registered');
        }
        data.bundleId = bundleId;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No changes to save');
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data,
    });

    return {
      id: updated.id,
      name: updated.name,
      contactEmail: updated.contactEmail,
      bundleId: updated.bundleId,
      clientId: updated.clientId,
      status: updated.status,
      createdAt: updated.createdAt,
    };
  }

  async listFilters() {
    return this.prisma.filter.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }
}
