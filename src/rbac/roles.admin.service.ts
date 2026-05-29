import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminModule } from '@prisma/client';
import slugify from 'slugify';
import { PrismaService } from '../database/prisma.service';
import { ALL_ADMIN_MODULES } from './admin-modules';
import { UpsertAdminRoleDto } from './dto/upsert-role.dto';

@Injectable()
export class RolesAdminService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.adminRole.findMany({
      include: {
        permissions: { orderBy: { module: 'asc' } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  get(id: string) {
    return this.prisma.adminRole.findUniqueOrThrow({
      where: { id },
      include: { permissions: { orderBy: { module: 'asc' } } },
    });
  }

  async create(dto: UpsertAdminRoleDto) {
    const slug = this.uniqueSlug(dto.name);
    const existing = await this.prisma.adminRole.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (existing) {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }

    return this.prisma.adminRole.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        permissions: {
          create: this.buildPermissionRows(dto),
        },
      },
      include: { permissions: true },
    });
  }

  async update(id: string, dto: UpsertAdminRoleDto) {
    const role = await this.prisma.adminRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    if (role.isSystem) {
      throw new BadRequestException('Los roles del sistema no se pueden modificar');
    }

    const conflict = await this.prisma.adminRole.findFirst({
      where: {
        name: dto.name,
        NOT: { id },
      },
    });
    if (conflict) throw new ConflictException('Ya existe un rol con ese nombre');

    await this.prisma.adminRolePermission.deleteMany({ where: { roleId: id } });

    return this.prisma.adminRole.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        permissions: {
          create: this.buildPermissionRows(dto),
        },
      },
      include: { permissions: true },
    });
  }

  async remove(id: string) {
    const role = await this.prisma.adminRole.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    if (role.isSystem) {
      throw new BadRequestException('Los roles del sistema no se pueden eliminar');
    }
    if (role._count.users > 0) {
      throw new BadRequestException(
        'No se puede eliminar: hay usuarios asignados a este rol',
      );
    }
    await this.prisma.adminRole.delete({ where: { id } });
    return { ok: true };
  }

  private buildPermissionRows(dto: UpsertAdminRoleDto) {
    const byModule = new Map(dto.permissions.map((p) => [p.module, p]));
    return ALL_ADMIN_MODULES.map((module) => {
      const p = byModule.get(module);
      return {
        module,
        canView: p?.canView ?? false,
        canEdit: p?.canEdit ?? false,
        canDelete: p?.canDelete ?? false,
      };
    });
  }

  private uniqueSlug(name: string) {
    const base = slugify(name, { lower: true, strict: true }) || 'rol';
    return base;
  }

  async ensureSystemRoles() {
    const adminSlug = 'administrador';
    let adminRole = await this.prisma.adminRole.findUnique({
      where: { slug: adminSlug },
      include: { permissions: true },
    });
    if (!adminRole) {
      adminRole = await this.prisma.adminRole.create({
        data: {
          name: 'Administrador',
          slug: adminSlug,
          description: 'Acceso completo al backoffice',
          isSystem: true,
          permissions: {
            create: ALL_ADMIN_MODULES.map((module) => ({
              module: module as AdminModule,
              canView: true,
              canEdit: true,
              canDelete: true,
            })),
          },
        },
        include: { permissions: true },
      });
    } else {
      const existing = new Set(adminRole.permissions.map((p) => p.module));
      const missing = ALL_ADMIN_MODULES.filter((m) => !existing.has(m));
      if (missing.length > 0) {
        await this.prisma.adminRolePermission.createMany({
          data: missing.map((module) => ({
            roleId: adminRole!.id,
            module: module as AdminModule,
            canView: true,
            canEdit: true,
            canDelete: true,
          })),
        });
      }
    }
    return adminRole;
  }
}
