import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  tenantId?: number | null;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  tenantId: number | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private toAuthUser(user: {
    id: number;
    email: string;
    name: string | null;
    role: UserRole;
    tenantId: number | null;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  private signToken(user: AuthUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return this.jwt.sign(payload);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    const authUser = this.toAuthUser(user);
    return { token: this.signToken(authUser), user: authUser };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const bundleId = dto.bundleId.trim();
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(bundleId)) {
      throw new BadRequestException('Bundle ID must look like com.yourcompany.app');
    }

    const clientId = `wl_${randomBytes(8).toString('hex')}`;
    const clientSecret = randomBytes(24).toString('base64url');
    const secretHash = TenantsService.hashSecret(clientSecret);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const colorFilters = await this.prisma.filter.findMany({
      where: { category: 'color' },
      select: { id: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.appName.trim(),
          contactEmail: email,
          bundleId,
          clientId,
          clientSecretHash: secretHash,
          status: 'active',
        },
      });

      for (const filter of colorFilters) {
        await tx.tenantEntitledFilter.create({
          data: { tenantId: tenant.id, filterId: filter.id },
        });
        await tx.tenantEnabledFilter.create({
          data: { tenantId: tenant.id, filterId: filter.id },
        });
      }

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: dto.name?.trim() || dto.appName.trim(),
          role: UserRole.TENANT,
          tenantId: tenant.id,
          status: 'active',
        },
      });

      return { tenant, user };
    });

    const authUser = this.toAuthUser(result.user);
    return {
      token: this.signToken(authUser),
      user: authUser,
      credentials: {
        clientId: result.tenant.clientId,
        clientSecret,
        bundleId: result.tenant.bundleId,
      },
    };
  }

  async getMe(userId: number): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'active') throw new UnauthorizedException();
    return this.toAuthUser(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name?.trim() || undefined },
    });
    return this.toAuthUser(user);
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  }
}
