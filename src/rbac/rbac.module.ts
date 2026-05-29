import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesAdminController } from './roles.admin.controller';
import { RolesAdminService } from './roles.admin.service';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';
import { UsersAdminController } from './users.admin.controller';
import { UsersAdminService } from './users.admin.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [RolesAdminController, UsersAdminController],
  providers: [
    PermissionsService,
    PermissionsGuard,
    RolesAdminService,
    UsersAdminService,
  ],
  exports: [PermissionsService, PermissionsGuard],
})
export class RbacModule implements OnModuleInit {
  constructor(private readonly rolesService: RolesAdminService) {}

  async onModuleInit() {
    await this.rolesService.ensureSystemRoles();
  }
}
