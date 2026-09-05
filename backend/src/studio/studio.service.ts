import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
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

  async regenerateSecret(user: AuthUser) {
    const tenantId = this.tenantIdFor(user);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const clientSecret = randomBytes(24).toString('base64url');
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { clientSecretHash: TenantsService.hashSecret(clientSecret) },
    });

    return { clientId: tenant.clientId, clientSecret, bundleId: tenant.bundleId };
  }

  async updateDetails(
    user: AuthUser,
    input: { name?: string; contactEmail?: string; bundleId?: string },
  ) {
    const tenantId = this.tenantIdFor(user);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
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
          where: { bundleId, NOT: { id: tenantId } },
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
      where: { id: tenantId },
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
}
