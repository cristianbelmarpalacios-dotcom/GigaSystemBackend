import { SetMetadata } from '@nestjs/common';
import { AdminModule } from '@prisma/client';
import type { PermissionAction } from './admin-modules';

export const PERMISSION_KEY = 'permission';

export type RequiredPermission = {
  module: AdminModule;
  action: PermissionAction;
};

export const RequirePermission = (
  module: AdminModule,
  action: PermissionAction,
) => SetMetadata(PERMISSION_KEY, { module, action } satisfies RequiredPermission);
