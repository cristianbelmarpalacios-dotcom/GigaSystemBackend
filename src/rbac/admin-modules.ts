import { AdminModule } from '@prisma/client';

export const ALL_ADMIN_MODULES = Object.values(AdminModule);

export type PermissionAction = 'view' | 'edit' | 'delete';

export type ModulePermissions = {
  view: boolean;
  edit: boolean;
  delete: boolean;
};

export type PermissionsMap = Record<AdminModule, ModulePermissions>;

export function emptyPermissionsMap(): PermissionsMap {
  return ALL_ADMIN_MODULES.reduce((acc, mod) => {
    acc[mod] = { view: false, edit: false, delete: false };
    return acc;
  }, {} as PermissionsMap);
}

export function fullPermissionsMap(): PermissionsMap {
  return ALL_ADMIN_MODULES.reduce((acc, mod) => {
    acc[mod] = { view: true, edit: true, delete: true };
    return acc;
  }, {} as PermissionsMap);
}
