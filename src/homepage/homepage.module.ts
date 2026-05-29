import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { MediaModule } from '../media/media.module';
import { RbacModule } from '../rbac/rbac.module';
import { HomepageAdminController } from './homepage.admin.controller';
import { HomepagePublicController } from './homepage.public.controller';
import { HomepageService } from './homepage.service';

@Module({
  imports: [CatalogModule, MediaModule, AuthModule, RbacModule],
  providers: [HomepageService],
  controllers: [HomepagePublicController, HomepageAdminController],
})
export class HomepageModule {}
