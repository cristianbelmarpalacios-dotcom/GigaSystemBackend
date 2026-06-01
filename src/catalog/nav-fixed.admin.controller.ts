import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminModule } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { UpdateNavFixedItemDto } from './dto/update-nav-fixed-item.dto';
import { NavFixedService } from './nav-fixed.service';

@Controller('v1/admin/nav-fixed')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF')
export class NavFixedAdminController {
  constructor(private readonly navFixedService: NavFixedService) {}

  @Get()
  @RequirePermission(AdminModule.CATEGORIES, 'view')
  list() {
    return this.navFixedService.listAdmin();
  }

  @Get(':slug')
  @RequirePermission(AdminModule.CATEGORIES, 'view')
  get(@Param('slug') slug: string) {
    return this.navFixedService.getBySlug(slug);
  }

  @Patch(':slug')
  @RequirePermission(AdminModule.CATEGORIES, 'edit')
  update(@Param('slug') slug: string, @Body() dto: UpdateNavFixedItemDto) {
    return this.navFixedService.update(slug, dto);
  }
}
