import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PermissionsService } from './permissions.service';
import {
  PERMISSION_KEY,
  type RequiredPermission,
} from './require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { userId: string; role?: UserRole };
    }>();
    const userId = request.user?.userId;
    const role = request.user?.role;
    if (!userId || !role) return false;

    if (role !== UserRole.ADMIN && role !== UserRole.STAFF) {
      throw new ForbiddenException('Sin acceso al panel de administración');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { adminRoleId: true, role: true },
    });
    if (!user) return false;

    const access = await this.permissionsService.getUserAccess(
      userId,
      user.role,
      user.adminRoleId,
    );

    if (
      !this.permissionsService.hasAction(
        access.permissionsMap,
        required.module,
        required.action,
      )
    ) {
      throw new ForbiddenException(
        'No tienes permiso para esta acción en este módulo',
      );
    }

    return true;
  }
}
