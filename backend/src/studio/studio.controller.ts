import { Body, Controller, Get, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.service';
import { StudioService } from './studio.service';
import { SetEnabledDto } from './dto/set-enabled.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('v1/studio')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT)
export class StudioController {
  constructor(private readonly studio: StudioService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.studio.getOverview(user);
  }

  @Put('filters/enabled')
  setEnabled(@CurrentUser() user: AuthUser, @Body() body: SetEnabledDto) {
    return this.studio.setEnabledFilters(user, body.filterIds ?? []);
  }

  @Post('regenerate-secret')
  regenerateSecret(@CurrentUser() user: AuthUser) {
    return this.studio.regenerateSecret(user);
  }

  @Patch('tenant')
  updateTenant(@CurrentUser() user: AuthUser, @Body() body: UpdateTenantDto) {
    return this.studio.updateDetails(user, body);
  }
}
