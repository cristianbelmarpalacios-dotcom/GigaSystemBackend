import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PermissionsService } from '../rbac/permissions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async register(input: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    return this.issueTokens(await this.loadUser(user.id));
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Cuenta desactivada');
    }
    return this.issueTokens(await this.loadUser(user.id));
  }

  private loadUser(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        adminRole: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        adminRole: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sesión inválida');
    }
    return this.toUserPayload(user);
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string | null;
    lastName: string | null;
    adminRoleId: string | null;
    adminRole?: { id: string; name: string; slug: string } | null;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      user: await this.toUserPayload(user),
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_ACCESS_EXPIRES_IN',
        ) as never,
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as never,
      }),
    };
  }

  private async toUserPayload(user: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string | null;
    lastName: string | null;
    adminRoleId: string | null;
    adminRole?: { id: string; name: string; slug: string } | null;
  }) {
    const access =
      user.role === UserRole.ADMIN || user.role === UserRole.STAFF
        ? await this.permissionsService.getUserAccess(
            user.id,
            user.role,
            user.adminRoleId,
          )
        : null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      adminRole: user.adminRole ?? access?.adminRole ?? null,
      permissions: access?.permissions ?? [],
    };
  }
}
