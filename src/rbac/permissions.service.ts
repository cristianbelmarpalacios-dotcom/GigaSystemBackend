import { Injectable } from '@nestjs/common';
import { AdminModule, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  ALL_ADMIN_MODULES,
  emptyPermissionsMap,
  fullPermissionsMap,
  type ModulePermissions,
  type PermissionAction,
  type PermissionsMap,
} from './admin-modules';

export type AdminPermissionDto = {
  module: AdminModule;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type UserAccessProfile = {
  adminRole: { id: string; name: string; slug: string } | null;
  permissions: AdminPermissionDto[];
  permissionsMap: PermissionsMap;
};

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserAccess(
    userId: string,
    userRole: UserRole,
    adminRoleId: string | null,
  ): Promise<UserAccessProfile> {
    if (userRole === UserRole.ADMIN && !adminRoleId) {
      return {
        adminRole: null,
        permissions: this.mapToDto(fullPermissionsMap()),
        permissionsMap: fullPermissionsMap(),
      };
    }

    if (!adminRoleId) {
      const empty = emptyPermissionsMap();
      return {
        adminRole: null,
        permissions: this.mapToDto(empty),
        permissionsMap: empty,
      };
    }

    const role = await this.prisma.adminRole.findUnique({
      where: { id: adminRoleId },
      include: { permissions: true },
    });

    if (!role) {
      const empty = emptyPermissionsMap();
      return {
        adminRole: null,
        permissions: this.mapToDto(empty),
        permissionsMap: empty,
      };
    }

    const map = emptyPermissionsMap();
    for (const p of role.permissions) {
      map[p.module] = {
        view: p.canView,
        edit: p.canEdit,
        delete: p.canDelete,
      };
    }

    return {
      adminRole: { id: role.id, name: role.name, slug: role.slug },
      permissions: this.mapToDto(map),
      permissionsMap: map,
    };
  }

  hasAction(map: PermissionsMap, module: AdminModule, action: PermissionAction) {
    const p = map[module];
    if (action === 'view') return p.view;
    if (action === 'edit') return p.edit;
    return p.delete;
  }

  mapToDto(map: PermissionsMap): AdminPermissionDto[] {
    return ALL_ADMIN_MODULES.map((module) => ({
      module,
      canView: map[module].view,
      canEdit: map[module].edit,
      canDelete: map[module].delete,
    }));
  }

  normalizePermissionInput(
    input: Array<{
      module: AdminModule;
      canView?: boolean;
      canEdit?: boolean;
      canDelete?: boolean;
    }>,
  ): ModulePermissions[] {
    const map = emptyPermissionsMap();
    for (const row of input) {
      map[row.module] = {
        view: !!row.canView,
        edit: !!row.canEdit,
        delete: !!row.canDelete,
      };
    }
    return ALL_ADMIN_MODULES.map((module) => ({
      module,
      ...map[module],
    }));
  }
}
