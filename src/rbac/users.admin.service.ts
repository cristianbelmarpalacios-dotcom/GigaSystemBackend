import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class UsersAdminService {
  constructor(private readonly prisma: PrismaService) {}

  listStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.STAFF] } },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        adminRole: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { email: 'asc' },
    });
  }

  async create(dto: CreateAdminUserDto) {
    if (dto.role === UserRole.CUSTOMER) {
      throw new BadRequestException('Use un rol ADMIN o STAFF para el backoffice');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('El correo ya está registrado');

    if (dto.adminRoleId) {
      await this.prisma.adminRole.findUniqueOrThrow({
        where: { id: dto.adminRoleId },
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        adminRoleId: dto.adminRoleId ?? null,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        adminRole: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === UserRole.CUSTOMER) {
      throw new BadRequestException('Este usuario no es de backoffice');
    }

    if (dto.role === UserRole.CUSTOMER) {
      throw new BadRequestException('No se puede degradar a cliente desde aquí');
    }

    if (dto.adminRoleId) {
      await this.prisma.adminRole.findUniqueOrThrow({
        where: { id: dto.adminRoleId },
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        role: dto.role,
        adminRoleId:
          dto.adminRoleId === undefined ? undefined : dto.adminRoleId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        adminRole: { select: { id: true, name: true, slug: true } },
      },
    });
  }
}
