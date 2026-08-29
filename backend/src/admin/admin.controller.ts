import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.service';
import { AdminService } from './admin.service';
import { FilterIdsDto, StatusDto } from './dto/admin.dto';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('tenants')
  listTenants(@CurrentUser() _user: AuthUser) {
    return this.admin.listTenants();
  }

  @Get('tenants/:id')
  getTenant(@Param('id', ParseIntPipe) id: number) {
    return this.admin.getTenant(id);
  }

  @Patch('tenants/:id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: StatusDto) {
    return this.admin.updateTenantStatus(id, body.status);
  }

  @Put('tenants/:id/entitled')
  setEntitled(@Param('id', ParseIntPipe) id: number, @Body() body: FilterIdsDto) {
    return this.admin.setEntitledFilters(id, body.filterIds ?? []);
  }

  @Post('tenants/:id/regenerate-secret')
  regenerateSecret(@Param('id', ParseIntPipe) id: number) {
    return this.admin.regenerateSecret(id);
  }

  @Get('filters')
  listFilters() {
    return this.admin.listFilters();
  }
}
