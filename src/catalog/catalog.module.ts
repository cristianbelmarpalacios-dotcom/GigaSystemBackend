import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { CatalogService } from './catalog.service';
import { CatalogPublicController } from './catalog.public.controller';
import { CatalogAdminController } from './catalog.admin.controller';
import { BrandsAdminController } from './brands.admin.controller';
import { CategoriesAdminController } from './categories.admin.controller';
import { CategoriesPublicController } from './categories.public.controller';

@Module({
  imports: [AuthModule, RbacModule],
  providers: [CatalogService],
  controllers: [
    CatalogPublicController,
    CategoriesPublicController,
    CatalogAdminController,
    BrandsAdminController,
    CategoriesAdminController,
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
