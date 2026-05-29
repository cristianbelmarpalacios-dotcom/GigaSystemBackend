import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminModule, ProductStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('v1/admin/products')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF')
export class CatalogAdminController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post()
  @RequirePermission(AdminModule.PRODUCTS, 'edit')
  create(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto);
  }

  @Get()
  @RequirePermission(AdminModule.PRODUCTS, 'view')
  list(@Query('status') status?: ProductStatus) {
    return this.catalogService.listAdminProducts(status);
  }

  @Get(':id')
  @RequirePermission(AdminModule.PRODUCTS, 'view')
  get(@Param('id') id: string) {
    return this.catalogService.getAdminProduct(id);
  }

  @Patch(':id')
  @RequirePermission(AdminModule.PRODUCTS, 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.catalogService.updateProduct(id, dto);
  }

  @Delete(':id')
  @RequirePermission(AdminModule.PRODUCTS, 'delete')
  remove(@Param('id') id: string) {
    return this.catalogService.archiveProduct(id);
  }
}
