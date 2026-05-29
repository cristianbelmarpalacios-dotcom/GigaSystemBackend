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
import { AdminModule, CategoryStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('v1/admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF')
export class CategoriesAdminController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @RequirePermission(AdminModule.CATEGORIES, 'view')
  list(@Query('status') status?: CategoryStatus) {
    return this.catalogService.listCategories(status);
  }

  @Post()
  @RequirePermission(AdminModule.CATEGORIES, 'edit')
  create(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Get(':id')
  @RequirePermission(AdminModule.CATEGORIES, 'view')
  get(@Param('id') id: string) {
    return this.catalogService.getAdminCategory(id);
  }

  @Patch(':id')
  @RequirePermission(AdminModule.CATEGORIES, 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Delete(':id')
  @RequirePermission(AdminModule.CATEGORIES, 'delete')
  remove(@Param('id') id: string) {
    return this.catalogService.archiveCategory(id);
  }
}
