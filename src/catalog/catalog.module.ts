import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { CatalogService } from './catalog.service';
import { CatalogPublicController } from './catalog.public.controller';
import { CatalogAdminController } from './catalog.admin.controller';
import { BrandsAdminController } from './brands.admin.controller';
import { CategoriesAdminController } from './categories.admin.controller';
import { CategoriesPublicController } from './categories.public.controller';
import { NavFixedAdminController } from './nav-fixed.admin.controller';
import { NavFixedPublicController } from './nav-fixed.public.controller';
import { NavFixedService } from './nav-fixed.service';

@Module({
  imports: [AuthModule, RbacModule],
  providers: [CatalogService, NavFixedService],
  controllers: [
    CatalogPublicController,
    CategoriesPublicController,
    NavFixedPublicController,
    CatalogAdminController,
    BrandsAdminController,
    CategoriesAdminController,
    NavFixedAdminController,
  ],
  exports: [CatalogService, NavFixedService],
})
export class CatalogModule {}
