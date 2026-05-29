import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminModule } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CatalogService } from './catalog.service';

@Controller('v1/admin/brands')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF')
export class BrandsAdminController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @RequirePermission(AdminModule.PRODUCTS, 'view')
  list() {
    return this.catalogService.listBrands();
  }

  @Post()
  @RequirePermission(AdminModule.PRODUCTS, 'edit')
  create(@Body() body: { name: string }) {
    return this.catalogService.createBrand(body.name);
  }
}
