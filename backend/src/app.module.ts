import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { LicenseModule } from './license/license.module';
import { CatalogModule } from './catalog/catalog.module';
import { AuthModule } from './auth/auth.module';
import { StudioModule } from './studio/studio.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    TenantsModule,
    LicenseModule,
    CatalogModule,
    AuthModule,
    StudioModule,
    AdminModule,
  ],
})
export class AppModule {}
