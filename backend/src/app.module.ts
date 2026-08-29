import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { LicenseModule } from './license/license.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [PrismaModule, TenantsModule, LicenseModule, CatalogModule],
})
export class AppModule {}
